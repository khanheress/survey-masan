import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {getProjectDeliveries,saveDelivery,DeliveryError} from '@/lib/deliveryStore.mjs';
export async function GET(request,context){
 if(!await getServerSession(authOptions))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const {projectId}=await context.params;return NextResponse.json(await getProjectDeliveries(await getDb(),projectId),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:e instanceof DeliveryError?e.message:'Không thể tải giao mẫu.'},{status:e instanceof DeliveryError?e.status:500});}
}
export async function PATCH(request,context){
 const session=await getServerSession(authOptions);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const {projectId}=await context.params;return NextResponse.json(await saveDelivery(await getDb(),projectId,await request.json(),session.user.id));}catch(e){return NextResponse.json({error:e instanceof DeliveryError?e.message:'Không thể lưu thông tin giao mẫu.'},{status:e instanceof DeliveryError?e.status:500});}
}
