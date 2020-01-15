import * as React from 'react';
import { SecurityRequirements } from '../SecurityRequirement/SecurityRequirement';

import { observer } from 'mobx-react';

import { Badge, DarkRightPanel, H2, MiddlePanel, Row } from '../../common-elements';

import { OptionsContext } from '../OptionsProvider';

import { ShareLink } from '../../common-elements/linkify';
import { Endpoint } from '../Endpoint/Endpoint';
import { ExternalDocumentation } from '../ExternalDocumentation/ExternalDocumentation';
import { Markdown } from '../Markdown/Markdown';
import { Parameters } from '../Parameters/Parameters';
import { RequestSamples } from '../RequestSamples/RequestSamples';
import { ResponsesList } from '../Responses/ResponsesList';
import { ResponseSamples } from '../ResponseSamples/ResponseSamples';

import { OperationModel as OperationType } from '../../services/models';
import { CallbacksList } from '../Callbacks';
import { CallbackSamples } from '../CallbackSamples/CallbackSamples';
import styled from '../../styled-components';
import { Extensions } from '../Fields/Extensions';

const CallbackMiddlePanel = styled(MiddlePanel)`
  width: 100%;
`;

const OperationRow = styled(Row)`
  backface-visibility: hidden;
  contain: content;

  overflow: hidden;
`;

const Description = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.unit * 6}px;
`;

export interface OperationProps {
  operation: OperationType;
}

@observer
export class Operation extends React.Component<OperationProps> {
  render() {
    const { operation } = this.props;

    const { name: summary, description, deprecated, externalDocs } = operation;
    const hasDescription = !!(description || externalDocs);

    // If this operation is a callback, we won't have a DarkRightPanel, so we can expand the middle panel to 100% width of parent container.
    const AdaptiveMiddlePanel = operation.isCallback ? CallbackMiddlePanel : MiddlePanel;

    // Non-callback operations will have a DarkRightPanel, callback operations will not.
    const renderDarkRightPanel = options => {
      if (!operation.isCallback) {
        return (
          <DarkRightPanel>
            {!options.pathInMiddlePanel && <Endpoint operation={operation} />}
            <RequestSamples operation={operation} />
            <ResponseSamples operation={operation} />
            <CallbackSamples callbacks={operation.callbacks} />
          </DarkRightPanel>
        );
      }
    };

    return (
      <OptionsContext.Consumer>
        {options => (
          <OperationRow>
            <AdaptiveMiddlePanel>
              <H2>
                <ShareLink to={operation.id} />
                {summary} {deprecated && <Badge type="warning"> Deprecated </Badge>}
              </H2>
              {options.pathInMiddlePanel && <Endpoint operation={operation} inverted={true} />}
              {hasDescription && (
                <Description>
                  {description !== undefined && <Markdown source={description} />}
                  {externalDocs && <ExternalDocumentation externalDocs={externalDocs} />}
                </Description>
              )}
              <Extensions extensions={operation.extensions} />
              <SecurityRequirements securities={operation.security} />
              <Parameters parameters={operation.parameters} body={operation.requestBody} />
              <ResponsesList responses={operation.responses} />
              <CallbacksList callbacks={operation.callbacks} />
            </AdaptiveMiddlePanel>
            {renderDarkRightPanel(options)}
          </OperationRow>
        )}
      </OptionsContext.Consumer>
    );
  }
}
