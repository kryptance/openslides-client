import { TreeIdNode } from 'app/core/ui-services/tree.service';
import { HasMeetingId } from 'app/shared/models/base/has-meeting-id';
import { Identifiable } from 'app/shared/models/base/identifiable';
import { Fqid, Id } from '../definitions/key-types';

export namespace AgendaItemAction {
    interface OptionalPayload {
        item_number?: string;
        comment?: string;
        closed?: boolean;
        type?: number;
        duration?: number; // in seconds
        weight?: number;
        tag_ids?: Id[];
    }

    export interface CreatePayload extends OptionalPayload {
        // Required
        content_object_id: Fqid;

        // Optional
        parent_id?: Id;
    }

    export interface UpdatePayload extends Identifiable, OptionalPayload {}
    export interface AssignPayload extends HasMeetingId {
        ids: Id[];
        parent_id: Id;
    }
    export interface SortPayload extends HasMeetingId {
        tree: TreeIdNode[];
    }
    export interface NumberingPayload extends HasMeetingId {}
}