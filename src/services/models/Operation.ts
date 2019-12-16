import { action, observable } from 'mobx';

import { IMenuItem } from '../MenuStore';
import { GroupModel } from './Group.model';
import { SecurityRequirementModel } from './SecurityRequirement';

import {
  OpenAPIExternalDocumentation,
  OpenAPIPath,
  OpenAPIServer,
  OpenAPIXCodeSample,
} from '../../types';

import {
  extractExtensions,
  getOperationSummary,
  getStatusCodeType,
  isStatusCode,
  JsonPointer,
  memoize,
  mergeParams,
  normalizeServers,
  sortByField,
  sortByRequired,
} from '../../utils';
import { ContentItemModel, ExtendedOpenAPIOperation } from '../MenuBuilder';
import { OpenAPIParser } from '../OpenAPIParser';
import { RedocNormalizedOptions } from '../RedocNormalizedOptions';
import { CallbackModel } from './Callback';
import { FieldModel } from './Field';
import { MediaContentModel } from './MediaContent';
import { RequestBodyModel } from './RequestBody';
import { ResponseModel } from './Response';

interface XPayloadSample {
  lang: 'payload';
  label: string;
  requestBodyContent: MediaContentModel;
  source: string;
}

export function isPayloadSample(
  sample: XPayloadSample | OpenAPIXCodeSample,
): sample is XPayloadSample {
  return sample.lang === 'payload' && (sample as any).requestBodyContent;
}

/**
 * Operation model ready to be used by components
 */
export class OperationModel implements IMenuItem {
  //#region IMenuItem fields
  id: string;
  absoluteIdx?: number;
  name: string;
  description?: string;
  type = 'operation' as 'operation';

  parent?: GroupModel;
  externalDocs?: OpenAPIExternalDocumentation;
  items: ContentItemModel[] = [];

  depth: number;

  @observable
  ready?: boolean = true;
  @observable
  active: boolean = false;
  @observable
  expanded: boolean = false;
  //#endregion

  pointer: string;
  operationId?: string;
  httpVerb: string;
  deprecated: boolean;
  path: string;
  servers: OpenAPIServer[];
  security: SecurityRequirementModel[];
  extensions: Dict<any>;
  isCallback: boolean;

  constructor(
    private parser: OpenAPIParser,
    private operationSpec: ExtendedOpenAPIOperation,
    parent: GroupModel | undefined,
    private options: RedocNormalizedOptions,
    isCallback: boolean = false,
    callbackEventName?: string,
  ) {
    this.pointer = JsonPointer.compile(['paths', operationSpec.pathName, operationSpec.httpVerb]);

    this.id =
      operationSpec.operationId !== undefined
        ? 'operation/' + operationSpec.operationId
        : parent !== undefined
        ? parent.id + this.pointer
        : this.pointer;

    this.description = operationSpec.description;
    this.parent = parent;
    this.externalDocs = operationSpec.externalDocs;

    this.deprecated = !!operationSpec.deprecated;
    this.httpVerb = operationSpec.httpVerb;
    this.deprecated = !!operationSpec.deprecated;
    this.operationId = operationSpec.operationId;
    this.path = operationSpec.pathName;
    this.isCallback = isCallback;
    this.codeSamples = operationSpec['x-code-samples'] || [];

    if (this.isCallback) {
      // NOTE: Use callback's event name as the view label, not the operationID.
      this.name = callbackEventName || getOperationSummary(operationSpec);
      // NOTE: Callbacks by default should not inherit the specification's global `security` definition.
      // Can be defined individually per-callback in the specification. Defaults to none.
      this.security = (operationSpec.security || []).map(
        security => new SecurityRequirementModel(security, parser),
      );
    } else {
      this.name = getOperationSummary(operationSpec);
      this.security = (operationSpec.security || parser.spec.security || []).map(
        security => new SecurityRequirementModel(security, parser),
      );
    }

    const requestBodyContent = this.requestBody && this.requestBody.content;
    if (requestBodyContent && requestBodyContent.hasSample) {
      const insertInx = Math.min(this.codeSamples.length, options.payloadSampleIdx);

      this.codeSamples = [
        ...this.codeSamples.slice(0, insertInx),
        {
          lang: 'payload',
          label: 'Payload',
          source: '',
          requestBodyContent,
        },
        ...this.codeSamples.slice(insertInx),
      ];
    }

    const pathInfo = parser.byRef<OpenAPIPath>(
      JsonPointer.compile(['paths', operationSpec.pathName]),
    );

    // NOTE: Callbacks by default will inherit the specification's global `servers` definition.
    // In many cases, this may be undesirable. Override individually in the specification to remedy this.
    this.servers = normalizeServers(
      parser.specUrl,
      operationSpec.servers || (pathInfo && pathInfo.servers) || parser.spec.servers || [],
    );

    if (options.showExtensions) {
      this.extensions = extractExtensions(operationSpec, options.showExtensions);
    }
  }

  /**
   * set operation as active (used by side menu)
   */
  @action
  activate() {
    this.active = true;
  }

  /**
   * set operation as inactive (used by side menu)
   */
  @action
  deactivate() {
    this.active = false;
  }

  expand() {
    if (this.parent) {
      this.parent.expand();
    }
  }

  collapse() {
    /* do nothing */
  }

  @memoize
  get requestBody() {
    return (
      this.operationSpec.requestBody &&
      new RequestBodyModel(this.parser, this.operationSpec.requestBody, this.options)
    );
  }

  @memoize
  get codeSamples() {
    let samples: Array<OpenAPIXCodeSample | XPayloadSample> =
      this.operationSpec['x-code-samples'] || [];

    const requestBodyContent = this.requestBody && this.requestBody.content;
    if (requestBodyContent && requestBodyContent.hasSample) {
      const insertInx = Math.min(samples.length, this.options.payloadSampleIdx);

      samples = [
        ...samples.slice(0, insertInx),
        {
          lang: 'payload',
          label: 'Payload',
          source: '',
          requestBodyContent,
        },
        ...samples.slice(insertInx),
      ];
    }

    return samples;
  }

  @memoize
  get parameters() {
    const _parameters = mergeParams(
      this.parser,
      this.operationSpec.pathParameters,
      this.operationSpec.parameters,
      // TODO: fix pointer
    ).map(paramOrRef => new FieldModel(this.parser, paramOrRef, this.pointer, this.options));

    if (this.options.sortPropsAlphabetically) {
      return sortByField(_parameters, 'name');
    }
    if (this.options.requiredPropsFirst) {
      return sortByRequired(_parameters);
    }

    return _parameters;
  }

  @memoize
  get responses() {
    let hasSuccessResponses = false;
    return Object.keys(this.operationSpec.responses || [])
      .filter(code => {
        if (code === 'default') {
          return true;
        }

        if (getStatusCodeType(code) === 'success') {
          hasSuccessResponses = true;
        }

        return isStatusCode(code);
      }) // filter out other props (e.g. x-props)
      .map(code => {
        return new ResponseModel(
          this.parser,
          code,
          hasSuccessResponses,
          this.operationSpec.responses[code],
          this.options,
        );
      });
  }

  @memoize
  get callbacks() {
    return Object.keys(this.operationSpec.callbacks || []).map(callbackEventName => {
      return new CallbackModel(
        this.parser,
        callbackEventName,
        this.operationSpec.callbacks![callbackEventName],
        this.options,
      );
    });
  }
}
