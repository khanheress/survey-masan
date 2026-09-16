import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/authOptions';
import {getDb} from '@/lib/db';
import {getProjectDeliveries} from '@/lib/deliveryStore.mjs';
export async function GET(){
 if(!await getServerSession(authOptions))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const db=await getDb();const projects=await db.prepare('SELECT id,name,status FROM projects ORDER BY created_at DESC,id').all();const data=[];for(const project of projects){const result=await getProjectDeliveries(db,project.id);data.push({...project,total:result.total,delivered:result.delivered});}return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Không thể tải danh sách giao mẫu.'},{status:500});}
}
