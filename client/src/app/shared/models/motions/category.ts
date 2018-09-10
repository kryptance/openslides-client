import { BaseModel } from '../base.model';

/**
 * Representation of a motion category. Has the nested property "File"
 * @ignore
 */
export class Category extends BaseModel {
    public id: number;
    public name: string;
    public prefix: string;

    public constructor(input?: any) {
        super('motions/category', input);
    }

    public toString = (): string => {
        return this.prefix + ' - ' + this.name;
    };
}

BaseModel.registerCollectionElement('motions/category', Category);
