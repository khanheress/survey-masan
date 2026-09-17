import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {listDeliveryProjects} from '@/lib/deliveryStore.mjs';
export async function GET(){
 if(!await getServerSession(authOptions))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const db=await getDb();const data=await listDeliveryProjects(db);return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Không thể tải danh sách giao mẫu.'},{status:500});}
}
