import { BaseModel } from '../base.model';
import { WorkflowState } from './workflow-state';

/**
 * Representation of a motion workflow. Has the nested property 'states'
 * @ignore
 */
export class Workflow extends BaseModel {
    public id: number;
    public name: string;
    public states: WorkflowState[];
    public first_state: number;

    public constructor(input?: any) {
        super('motions/workflow', input);
    }

    /**
     * Check if the containing @link{WorkflowState}s contain a given ID
     * @param id The State ID
     */
    public isStateContained(obj: number | WorkflowState): boolean {
        let id: number;
        if (obj instanceof WorkflowState) {
            id = obj.id;
        } else {
            id = obj;
        }

        return this.states.some(state => {
            if (state.id === id) {
                return true;
            }
        });
    }

    public state_by_id(id: number): WorkflowState {
        let targetState;
        this.states.forEach(state => {
            if (id === state.id) {
                targetState = state;
            }
        });
        return targetState as WorkflowState;
    }

    public deserialize(input: any): void {
        Object.assign(this, input);
        if (input.states instanceof Array) {
            this.states = [];
            input.states.forEach(workflowStateData => {
                this.states.push(new WorkflowState(workflowStateData));
            });
        }
    }
}

BaseModel.registerCollectionElement('motions/workflow', Workflow);
