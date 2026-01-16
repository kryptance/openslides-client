import { Injectable } from '@angular/core';

import { Presenter } from './presenter';
import { PresenterService } from './presenter.service';

export interface DecisionArchiveMotion {
    id: number;
    meeting_id: number;
    title: string;
    number: string;
    text: string;
    reason: string;
    created: number | null;
    workflow_timestamp: number | null;
    sequential_number: number | null;
    state_name: string;
    category_name?: string;
    category_prefix?: string;
    meeting_name: string;
    committee_name?: string;
}

export interface DecisionArchiveMeeting {
    id: number;
    name: string;
    start_time: number | null;
    end_time: number | null;
    committee_name?: string;
}

export interface GetDecisionArchivePresenterResult {
    motions: DecisionArchiveMotion[];
    meetings: DecisionArchiveMeeting[];
    total_count: number;
}

export interface GetDecisionArchivePresenterParams {
    meeting_id?: number;
    limit?: number;
    offset?: number;
}

@Injectable({
    providedIn: `root`
})
export class GetDecisionArchivePresenterService {
    public constructor(private presenter: PresenterService) {}

    public async call(params?: GetDecisionArchivePresenterParams): Promise<GetDecisionArchivePresenterResult> {
        return this.presenter.call<GetDecisionArchivePresenterResult>(Presenter.GET_DECISION_ARCHIVE, params || {});
    }
}
