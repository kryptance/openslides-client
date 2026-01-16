import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DecisionArchiveListComponent } from './components/decision-archive-list/decision-archive-list.component';

const routes: Routes = [
    {
        path: ``,
        component: DecisionArchiveListComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DecisionArchiveRoutingModule {}
