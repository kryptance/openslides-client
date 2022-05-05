import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    ViewChild,
    Input,
    Output,
    EventEmitter,
    OnDestroy,
    AfterViewInit,
    ChangeDetectorRef
} from '@angular/core';
import { CdkVirtualScrollViewport, ExtendedScrollToOptions } from '@angular/cdk/scrolling';
import { ViewChatGroup, ViewChatMessage } from 'src/app/site/pages/meetings/pages/chat';
import { FormControl, Validators, FormBuilder } from '@angular/forms';
import { CHAT_MESSAGE_MAX_LENGTH } from 'src/app/gateways/repositories/chat/chat-message-repository.service';
import { map, Observable, BehaviorSubject, of } from 'rxjs';
import { Permission } from 'src/app/domain/definitions/permission';
import {
    ChatGroupDialogData,
    ChatGroupDialogService
} from '../../../../modules/chat-group-dialog/services/chat-group-dialog.service';
import { ViewPortService } from 'src/app/site/services/view-port.service';
import { OperatorService } from 'src/app/site/services/operator.service';
import { PromptService } from 'src/app/ui/modules/prompt-dialog';
import { ChatGroupControllerService, ChatNotificationService } from '../../../../services';
import { ChatMessageControllerService } from '../../../../services/chat-message-controller.service';
import { TranslateService } from '@ngx-translate/core';
import { MeetingComponentServiceCollectorService } from 'src/app/site/pages/meetings/services/meeting-component-service-collector.service';
import { BaseMeetingComponent } from 'src/app/site/pages/meetings/base/base-meeting.component';
import { UnsafeHtml } from 'src/app/domain/definitions/key-types';
import { ViewGroup } from 'src/app/site/pages/meetings/pages/participants';

@Component({
    selector: 'os-chat-group-detail',
    templateUrl: './chat-group-detail.component.html',
    styleUrls: ['./chat-group-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatGroupDetailComponent extends BaseMeetingComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild(CdkVirtualScrollViewport)
    private _virtualScrollViewPort!: CdkVirtualScrollViewport;

    @Input()
    public chatGroup!: ViewChatGroup;

    @Output()
    public backButtonClicked = new EventEmitter<void>();

    public newMessageForm!: FormControl;

    public get chatMessageMaxLength(): number {
        return CHAT_MESSAGE_MAX_LENGTH;
    }

    public get chatGroupObservable(): Observable<ViewChatGroup> {
        return this.repo.getViewModelObservable(this.chatGroup!.id) as Observable<ViewChatGroup>;
    }

    public get isEditingChatMessageObservable(): Observable<boolean> {
        return this._toEditChatMessageSubject.pipe(map(value => !!value));
    }

    public get hasWritePermissionsObservable(): Observable<boolean> {
        return this._hasWritePermissionsObservable;
    }

    public get canManage(): boolean {
        return this.operator.hasPerms(Permission.chatCanManage);
    }

    public get isMobileObservable(): Observable<boolean> {
        return this.vp.isMobileSubject.asObservable();
    }

    private get isOnBottomOfChat(): boolean {
        return this._virtualScrollViewPort.measureScrollOffset(`bottom`) === 0;
    }

    private _toEditChatMessageSubject = new BehaviorSubject<ViewChatMessage | null>(null);
    private _shouldScrollToBottom = true;
    private _hasWritePermissionsObservable: Observable<boolean> = of(false); // Not initialized

    public constructor(
        componentServiceCollector: MeetingComponentServiceCollectorService,
        translate: TranslateService,
        private repo: ChatGroupControllerService,
        private chatMessageRepo: ChatMessageControllerService,
        private chatNotificationService: ChatNotificationService,
        private promptService: PromptService,
        private cd: ChangeDetectorRef,
        private dialog: ChatGroupDialogService,
        private fb: FormBuilder,
        private vp: ViewPortService,
        private operator: OperatorService
    ) {
        super(componentServiceCollector, translate);
    }

    public ngOnInit(): void {
        this._hasWritePermissionsObservable = this.chatGroupObservable.pipe(
            map(chatGroup => this.canManage || this.operator.isInGroupIds(...(chatGroup?.write_group_ids || [])))
        );
        this.chatNotificationService.openChatGroup(this.chatGroup.id);
        this.newMessageForm = this.fb.control(``, [Validators.required, Validators.maxLength(CHAT_MESSAGE_MAX_LENGTH)]);
        this.subscriptions.push(
            this.newMessageForm.valueChanges.subscribe(text => {
                if (!text) {
                    this.newMessageForm.markAsUntouched();
                    this.newMessageForm.setErrors(null);
                }
            }),
            this.chatMessageRepo.getViewModelListObservable().subscribe(() => {
                if (this._shouldScrollToBottom) {
                    this.scrollToBottom();
                    this.triggerUpdateView();
                }
            })
        );
    }

    public ngAfterViewInit(): void {
        this.scrollToBottom();
        this.triggerUpdateView();
    }

    public override ngOnDestroy(): void {
        super.ngOnDestroy();
        this.chatNotificationService.closeChatGroup(this.chatGroup.id);
    }

    public onScrolledIndexChanged(): void {
        this._shouldScrollToBottom = this.isOnBottomOfChat;
    }

    public async sendChatMessage(): Promise<void> {
        const content = this.newMessageForm.value?.trim() as string;
        if (!content) {
            return;
        }
        if (this._toEditChatMessageSubject.value) {
            await this.updateChatMessage(content);
        } else {
            await this.createChatMessage(content);
        }
        this.cancelEditingChatMessage();
    }

    public async clearChatGroup(chatGroup: ViewChatGroup): Promise<void> {
        const title = this.translate.instant(`Are you sure you want to clear all messages in this chat?`);
        if (await this.promptService.open(title, chatGroup.name)) {
            await this.repo.clear(chatGroup).catch(this.raiseError);
            this.triggerUpdateView();
        }
    }

    public async editChatGroup(chatGroup: ViewChatGroup): Promise<void> {
        const chatData: ChatGroupDialogData = {
            name: chatGroup.name,
            read_group_ids: chatGroup.read_group_ids,
            write_group_ids: chatGroup.write_group_ids
        };

        const dialogRef = await this.dialog.open(chatData);
        dialogRef.afterClosed().subscribe(res => {
            if (res) {
                this.saveChanges(res);
            }
        });
    }

    public async deleteChatGroup(chatGroup: ViewChatGroup): Promise<void> {
        const title = this.translate.instant(`Are you sure you want to delete this chat group?`);
        const content = chatGroup.name;
        if (await this.promptService.open(title, content)) {
            await this.repo.delete(chatGroup).catch(this.raiseError);
            this.triggerUpdateView();
        }
    }

    public prepareEditingChatMessage(message: ViewChatMessage): void {
        this.newMessageForm.patchValue(message.content);
        this._toEditChatMessageSubject.next(message);
    }

    public cancelEditingChatMessage(): void {
        this.newMessageForm.patchValue(``);
        this._toEditChatMessageSubject.next(null);
    }

    public async deleteChatMessage(message: ViewChatMessage): Promise<void> {
        const title = this.translate.instant(`Are you sure you want to delete this message?`);
        if (await this.promptService.open(title)) {
            await this.chatMessageRepo.delete(message).catch(this.raiseError);
            this.triggerUpdateView();
        }
    }

    public getReadonlyGroups(chatGroup: ViewChatGroup): ViewGroup[] {
        const readGroups = chatGroup.read_groups;
        const writeGroups = chatGroup.write_group_ids || [];
        return readGroups.filter(group => !writeGroups.includes(group.id));
    }

    private async saveChanges(update: ChatGroupDialogData): Promise<void> {
        this.repo.update({ id: this.chatGroup.id, ...update });
    }

    private async updateChatMessage(content: UnsafeHtml): Promise<void> {
        await this.chatMessageRepo.update({ content, id: this._toEditChatMessageSubject.value!.id });
    }

    private async createChatMessage(content: UnsafeHtml): Promise<void> {
        await this.chatMessageRepo.create({ content, chat_group_id: this.chatGroup.id });
    }

    private scrollToBottom(): void {
        /**
         * I am aware that this is ugly, but that is the only way to get to
         * the bottom reliably
         * https://stackoverflow.com/questions/64932671/scroll-to-bottom-with-cdk-virtual-scroll-angular-8/65069130
         */
        const scrollTarget: ExtendedScrollToOptions = {
            bottom: 0,
            behavior: `auto`
        };
        setTimeout(() => {
            this._virtualScrollViewPort?.scrollTo(scrollTarget);
        }, 0);
        setTimeout(() => {
            this._virtualScrollViewPort?.scrollTo(scrollTarget);
        }, 100);
    }

    private triggerUpdateView(): void {
        this.cd.markForCheck();
    }
}