import { BaseModel } from '../base.model';

/**
 * Representation of user group.
 * @ignore
 */
export class Group extends BaseModel {
    public id: number;
    public name: string;
    public permissions: string[];

    public constructor(input?: any) {
        super('users/group', input);
    }

    public toString(): string {
        return this.name;
    }
}

BaseModel.registerCollectionElement('users/group', Group);
