import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import {
    DecisionArchiveMeeting,
    DecisionArchiveMotion,
    GetDecisionArchivePresenterService
} from 'src/app/gateways/presenter/get-decision-archive-presenter.service';
import { BaseComponent } from 'src/app/site/base/base.component';

@Component({
    selector: `os-decision-archive-list`,
    templateUrl: `./decision-archive-list.component.html`,
    styleUrls: [`./decision-archive-list.component.scss`],
    standalone: false
})
export class DecisionArchiveListComponent extends BaseComponent implements OnInit {
    public motions: DecisionArchiveMotion[] = [];
    public meetings: DecisionArchiveMeeting[] = [];
    public totalCount = 0;

    public isLoading = false;

    public pageSize = 20;
    public pageIndex = 0;

    public selectedMeetingId: number | null = null;

    public get groupedByMeeting(): Map<number, DecisionArchiveMotion[]> {
        const grouped = new Map<number, DecisionArchiveMotion[]>();
        for (const motion of this.motions) {
            if (!grouped.has(motion.meeting_id)) {
                grouped.set(motion.meeting_id, []);
            }
            grouped.get(motion.meeting_id)!.push(motion);
        }
        return grouped;
    }

    public constructor(
        protected override translate: TranslateService,
        private decisionArchivePresenter: GetDecisionArchivePresenterService
    ) {
        super();
    }

    public async ngOnInit(): Promise<void> {
        super.setTitle(`Decision archive`);
        await this.loadArchive();
    }

    public async loadArchive(): Promise<void> {
        this.isLoading = true;
        try {
            const result = await this.decisionArchivePresenter.call({
                meeting_id: this.selectedMeetingId || undefined,
                limit: this.pageSize,
                offset: this.pageIndex * this.pageSize
            });
            this.motions = result.motions;
            this.meetings = result.meetings;
            this.totalCount = result.total_count;
        } catch (error) {
            console.error(`Failed to load decision archive:`, error);
        } finally {
            this.isLoading = false;
        }
    }

    public async onMeetingFilterChange(): Promise<void> {
        this.pageIndex = 0;
        await this.loadArchive();
    }

    public async onPageChange(event: PageEvent): Promise<void> {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        await this.loadArchive();
    }

    public getMeetingName(meetingId: number): string {
        const meeting = this.meetings.find(m => m.id === meetingId);
        return meeting?.name || `Unknown meeting`;
    }

    public getCommitteeName(meetingId: number): string | undefined {
        const meeting = this.meetings.find(m => m.id === meetingId);
        return meeting?.committee_name;
    }

    public formatDate(timestamp: number | null): string {
        if (!timestamp) {
            return `-`;
        }
        return new Date(timestamp * 1000).toLocaleDateString();
    }
}
