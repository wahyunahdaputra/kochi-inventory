import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { isPage, text, type Row } from './shared';

function check<T>(result:{data:T;error: {message:string}|null}):T { if(result['error']) throw new Error(result['error'].message); return result['data']; }
const searchSchema=z.object({page:z.string().refine(isPage),q:z.string().max(100).default(''),department:z.string().default(''),status:z.string().default(''),category:z.string().default(''),type:z.string().default(''),from:z.string().default(''),to:z.string().default(''),offset:z.number().int().min(0).default(0),sort:z.enum(['created_at','name','current_stock']).default('created_at'),report:z.string().default('stok')});
export type SearchInput=z.infer<typeof searchSchema>;
export const workspace = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db:SupabaseClient=context.supabase;
 const profile=check(await db.from('profiles').select('*').eq('id',context.userId).single()) as Row;
 const role=check(await db.from('user_roles').select('role').eq('user_id',context.userId).maybeSingle());
 if(profile['status']!=='active') return {profile,role:text(role?.['role']),departments:[] as Row[],categories:[] as Row[],units:[] as Row[],suppliers:[] as Row[],locations:[] as Row[],items:[] as Row[]};
 const tables=['departments','categories','units','suppliers','locations'] as const;
 const results=await Promise.all(tables.map(t=>db.from(t).select('*').order('name').limit(500)));
 const [departments=[],categories=[],units=[],suppliers=[],locations=[]]=results.map(r=>check(r) as Row[]);
 return {profile,role:text(role?.['role']),departments,categories,units,suppliers,locations,items:[] as Row[]};
});
export const readPage=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(searchSchema).handler(async({data,context})=>{
 const db:SupabaseClient=context.supabase;
 const profile=check(await db.from('profiles').select('status').eq('id',context.userId).single());
 if(!profile||profile['status']!=='active') throw new Error('Akun belum mendapat persetujuan');
 const mapped:Record<string,string>={inventaris:'inventory_items',transaksi:'stock_transactions',pembelian:'purchases',aset:'asset_units',kategori:'categories',satuan:'units',pemasok:'suppliers',lokasi:'locations',pengguna:'profiles',audit:'audit_logs',pengaturan:'app_settings'};
 const table=data.page==='laporan' ? ({stok:'inventory_items',menipis:'inventory_items',habis:'inventory_items',masuk:'stock_transactions',keluar:'stock_transactions',penyesuaian:'stock_transactions',transaksi:'stock_transactions',pembelian:'purchases',aset:'asset_units'}[data.report] || 'inventory_items') : (mapped[data.page]||'stock_transactions');
 if(data.page==='dashboard') {
 const summary=check(await db.rpc('dashboard_summary',{p_department:data.department||null,p_from:data.from||null,p_to:data.to||null}));
 let recent=db.from('stock_transactions').select('*, inventory_items(name,code)').order('created_at',{ascending:false}).limit(6);
 let low=db.from('inventory_items').select('*,units(name),departments(name,code)').eq('status','active').in('stock_status',['menipis','habis']).order('current_stock').limit(6);
 if(data.department){recent=recent.eq('department_id',data.department);low=low.eq('department_id',data.department);}
 const [r,l]=await Promise.all([recent,low]);
 return {summary:summary as Row,rows:check(r) as Row[],low:check(l) as Row[],count:0};
 }
 const select=table==='inventory_items'?'*, departments(name,code), categories(name), units(name), suppliers(name), locations(name)':table==='stock_transactions'?'*, inventory_items(name,code),departments(name)':table==='purchases'?'*,suppliers(name),departments(name)':table==='asset_units'?'*,inventory_items(name),locations(name)':table==='profiles'?'*,departments(name)':'*';
 let query=db.from(table).select(select,{count:'exact'});
 if(data.department && !['units','suppliers','app_settings'].includes(table)) query=query.eq('department_id',data.department);
 if(data.q){const q=data.q.replace(/[,%()]/g,''); if(table==='inventory_items') query=query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);else if(table==='purchases')query=query.ilike('invoice_number',`%${q}%`);else if(table==='asset_units')query=query.ilike('asset_number',`%${q}%`);else if(table==='profiles')query=query.ilike('full_name',`%${q}%`);else if(['categories','units','suppliers','locations'].includes(table))query=query.ilike('name',`%${q}%`);}
 if(table==='inventory_items'){
 query=query.eq('status',data.status==='archived'?'archived':'active');
 if(['menipis','habis','normal'].includes(data.status))query=query.eq('stock_status',data.status);
 if(data.report==='menipis'||data.report==='habis')query=query.eq('stock_status',data.report);
 if(data.category)query=query.eq('category_id',data.category);
 if(data.type)query=query.eq('item_type',data.type);
 }
 if(table==='stock_transactions'){
 const kind=({'barang-masuk':'in','barang-keluar':'out',penyesuaian:'adjust'} as Record<string,string>)[data.page]||({masuk:'in',keluar:'out',penyesuaian:'adjust'} as Record<string,string>)[data.report];
 if(kind)query=query.eq('bucket',kind);
 if(data.status)query=query.eq('txn_type',data.status);
 }
 if(['stock_transactions','purchases','audit_logs'].includes(table)){
 const col=table==='purchases'?'purchase_date':table==='stock_transactions'?'occurred_at':'created_at';
 if(data.from)query=query.gte(col,data.from);if(data.to)query=query.lt(col,new Date(new Date(data.to).getTime()+86400000).toISOString());
 }
 query=query.order(table==='app_settings'?'key':table==='inventory_items'?data.sort:'created_at',{ascending:data.sort==='name'}).range(data.offset,data.offset+19);
 const result=await query;
 let rows=check(result) as Row[];
 if(table==='profiles'){const roles=check(await db.from('user_roles').select('user_id,role'));rows=rows.map((p:Row)=>({...p,user_roles:(roles||[]).filter((r:Row)=>r['user_id']===p['id'])}));}
 return {summary:{} as Row,rows,low:[] as Row[],count:result['count']||0};
});
const writeSchema=z.object({table:z.enum(['inventory_items','asset_units','categories','units','suppliers','locations','departments','profiles','app_settings']),id:z.string().optional(),values:z.record(z.unknown())});
const allowed:Record<string,string[]>={inventory_items:['name','department_id','category_id','unit_id','supplier_id','location_id','description','item_type','initial_stock','min_stock','purchase_date','unit_price','serial_number','asset_number','brand','model','status','notes','photo_path'],asset_units:['item_id','department_id','asset_number','serial_number','brand','model','location_id','assigned_to','condition','usage_status','purchase_date','purchase_price','photo_path','notes'],categories:['department_id','name','active'],units:['name','abbreviation','active'],suppliers:['name','contact_person','phone','email','address','notes','active'],locations:['department_id','name','description','active'],departments:['name','code','active'],profiles:['full_name','phone'],app_settings:['key','value']};
export const saveRow=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(writeSchema).handler(async({data,context})=>{
 const db:SupabaseClient=context.supabase;
 const values=Object.fromEntries(Object.entries(data.values).filter(([k])=>(allowed[data.table]||[]).includes(k)));
 if(data.table==='profiles' && data.id!==context.userId)throw new Error('Akses ditolak');
 if(data.id && data.table==='inventory_items'){delete values['initial_stock'];delete values['department_id'];}
 const result=data.id?await db.from(data.table).update(values).eq(data.table==='app_settings'?'key':'id',data.id).select().single():await db.from(data.table).insert(values).select().single();
 return check(result) as Row;
});
const actionSchema=z.object({action:z.enum(['in','out','adjust','purchase','reverse','cancel','assign']),values:z.record(z.unknown()),request:z.string().uuid().optional()});
export const performAction=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(actionSchema).handler(async({data,context})=>{
 const db:SupabaseClient=context.supabase;const v=data.values;const request=data.request;
 if(['in','out','adjust','purchase'].includes(data.action) && !request)throw new Error('Identitas transaksi wajib tersedia');
 const base={p_item:v['item_id'],p_request_id:request,p_notes:v['notes']||null};
 const map:Record<string,{fn:string;args:Record<string,unknown>}>= {
 in:{fn:'record_stock_in',args:{...base,p_qty:Number(v['quantity']),p_date:v['date'],p_supplier:v['supplier_id']||null,p_price:Number(v['unit_price'])||0,p_invoice:v['invoice_number']||null,p_reason:v['reason']||'Barang masuk'}},
 out:{fn:'record_stock_out',args:{...base,p_qty:Number(v['quantity']),p_date:v['date'],p_purpose:v['purpose'],p_used_by:v['used_by']||null}},
 adjust:{fn:'adjust_stock',args:{...base,p_delta:Number(v['quantity']),p_reason:v['reason']}},
 purchase:{fn:'create_purchase',args:{p_department:v['department_id'],p_supplier:v['supplier_id']||null,p_date:v['date'],p_invoice:v['invoice_number']||null,p_notes:v['notes']||null,p_items:v['items'],p_request_id:request}},
 reverse:{fn:'reverse_transaction',args:{p_txn:v['id'],p_reason:v['reason']}},cancel:{fn:'cancel_purchase',args:{p_purchase:v['id'],p_reason:v['reason']}},
 assign:{fn:'admin_assign_user',args:{p_user:v['id'],p_department:v['department_id']||null,p_role:v['role'],p_status:v['status'],p_record:!!v['can_record_stock']}}
 };const call=map[data.action];if(!call)throw new Error('Tindakan tidak valid');return check(await db.rpc(call.fn,call.args));
});
export const detail=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(z.object({table:z.enum(['inventory_items','purchases','stock_transactions','asset_units']),id:z.string().uuid()})).handler(async({data,context})=>{
 const db:SupabaseClient=context.supabase;
 const row=check(await db.from(data.table).select('*').eq('id',data.id).single()) as Row;
 const attachments=check(await db.from('file_attachments').select('*').eq('entity_id',data.id)) as Row[];
 let related:Row[]=[];
 if(data.table==='purchases')related=check(await db.from('purchase_items').select('*,inventory_items(name,code)').eq('purchase_id',data.id)) as Row[];
 if(data.table==='inventory_items')related=check(await db.from('stock_transactions').select('*').eq('item_id',data.id).order('created_at',{ascending:false}).limit(30)) as Row[];
 return {row,attachments,related};
});
export const signedFile=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(z.string().max(500)).handler(async({data,context})=>{
 const db:SupabaseClient=context.supabase;
 const signed=check(await db.storage.from('kochi-files').createSignedUrl(data,300));if(!signed)throw new Error('File tidak ditemukan');return signed.signedUrl;
});
