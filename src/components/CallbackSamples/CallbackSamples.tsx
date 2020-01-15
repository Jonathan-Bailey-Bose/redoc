import { observer } from 'mobx-react';
import * as React from 'react';
import { isPayloadSample, RedocNormalizedOptions } from '../../services';
import { PayloadSamples } from '../PayloadSamples/PayloadSamples';
import { SourceCodeWithCopy } from '../SourceCode/SourceCode';

import { RightPanelHeader, Tab, TabList, TabPanel, Tabs } from '../../common-elements';
import { OptionsContext } from '../OptionsProvider';
import { CallbackModel } from '../../services/models';

export interface CallbackSamplesProps {
  callbacks: CallbackModel[];
}

@observer
export class CallbackSamples extends React.Component<CallbackSamplesProps> {
  static contextType = OptionsContext;
  context: RedocNormalizedOptions;

  render() {
    const { callbacks } = this.props;

    const hasSamples = callbacks.length > 0;
    const hideTabList = callbacks.length === 1 ? this.context.hideSingleRequestSampleTab : false;

    const renderTabs = () => {
      return callbacks.map(callback => {
        return callback.operations.map(operation => {
          return <Tab key={operation.id + '_' + operation.name}>{operation.name}</Tab>;
        });
      });
    };

    const renderTabPanels = () => {
      return callbacks.map(callback => {
        return callback.operations.map(operation => {
          return operation.codeSamples.map(sample => {
            return (
              <TabPanel key={sample.lang + '_' + (sample.label || '')}>
                {isPayloadSample(sample) ? (
                  <div>
                    <PayloadSamples content={sample.requestBodyContent} />
                  </div>
                ) : (
                  <SourceCodeWithCopy lang={sample.lang} source={sample.source} />
                )}
              </TabPanel>
            );
          });
        });
      });
    };

    return (
      (hasSamples && (
        <div>
          <RightPanelHeader> Callback samples </RightPanelHeader>

          <Tabs defaultIndex={0}>
            <TabList hidden={hideTabList}>{renderTabs()}</TabList>
            {renderTabPanels()}
          </Tabs>
        </div>
      )) ||
      null
    );
  }
}
