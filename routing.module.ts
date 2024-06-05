import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/app.guard';

export const PRODRoutes: Routes = [
    
    { path: 'bill-of-materials', loadChildren: () => import('./bill-of-materials/bill-of-materials.module').then(m => m.BillOfMaterialsPageModule), canActivate: [AuthGuard] },
    { path: 'bill-of-materials/:id', loadChildren: () => import('./bill-of-materials-detail/bill-of-materials-detail.module').then(m => m.BillOfMaterialsDetailPageModule), canActivate: [AuthGuard] },
    { path: 'bill-of-materials/note/:id', loadChildren: () => import('./bill-of-materials-note/bill-of-materials-note.module').then(m => m.BillOfMaterialsNotePageModule), canActivate: [AuthGuard] },
    
    { path: 'order-recommendation', loadChildren: () => import('./order-recommendation/order-recommendation.module').then(m => m.OrderRecommendationPageModule), canActivate: [AuthGuard] },
    
    { path: 'staff-catering-booking-note', loadChildren: () => import('./staff-catering-booking-note/staff-catering-booking-note.module').then(m => m.StaffCateringBookingNotePageModule), canActivate: [AuthGuard] },
    { path: 'staff-catering-booking-note/:segment', loadChildren: () => import('./staff-catering-booking-note/staff-catering-booking-note.module').then(m => m.StaffCateringBookingNotePageModule), canActivate: [AuthGuard] },
    { path: 'forecast', loadChildren: () => import('./forecast/forecast.module').then(m => m.ForecastPageModule), canActivate: [AuthGuard] },
    { path: 'forecast/:id', loadChildren: () => import('./forecast-detail/forecast-detail.module').then(m => m.ForecastDetailPageModule), canActivate: [AuthGuard] },
   
];
