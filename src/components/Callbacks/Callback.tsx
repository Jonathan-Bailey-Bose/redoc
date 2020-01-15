import { observer } from 'mobx-react';
import * as React from 'react';
import { CallbackModel } from '../../services/models';
import { CallbackDetailsWrap, StyledCallbackTitle } from '../Callbacks/styled.elements';
import { ContentItem } from '../ContentItems/ContentItems';

@observer
export class CallbackView extends React.Component<{ callback: CallbackModel }> {
  toggle = () => {
    this.props.callback.toggle();
  };

  render() {
    const { name, expanded } = this.props.callback;

    return (
      <div>
        <StyledCallbackTitle onClick={this.toggle} name={name} opened={expanded} />
        {expanded && (
          <CallbackDetailsWrap>
            {this.props.callback.operations.map(operation => {
              return <ContentItem key={operation.id} item={operation} />;
            })}
          </CallbackDetailsWrap>
        )}
      </div>
    );
  }
}
