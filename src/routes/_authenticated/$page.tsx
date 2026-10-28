import { createFileRoute, notFound, type SearchSchemaInput } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { workspace, readPage } from '@/lib/kochi/data.functions';
import { isPage, pages } from '@/lib/kochi/shared';
import { WorkspacePage } from '@/components/kochi/workspace-page';
export const workspaceQuery=queryOptions({queryKey:['workspace'],queryFn:()=>workspace(),staleTime:60000});
export const Route=createFileRoute('/_authenticated/$page')({
 validateSearch:(s:Record<string,unknown>): Omit<import('@/lib/kochi/data.functions').SearchInput,'page'>=>({q:String(s['q']||''),department:String(s['department']||''),status:String(s['status']||''),category:String(s['category']||''),type:String(s['type']||''),from:String(s['from']||''),to:String(s['to']||''),offset:Math.max(0,Number(s['offset'])||0),sort:(['name','current_stock'].includes(String(s['sort']))?s['sort']:'created_at') as 'name'|'current_stock'|'created_at',report:String(s['report']||'stok')}),
 loaderDeps:({search})=>search,
 loader:async({params,deps,context})=>{if(!isPage(params.page))throw notFound();const ws=await context.queryClient.ensureQueryData(workspaceQuery);if(ws.profile['status']==='active'&&!['profil','akses-ditolak'].includes(params.page))await context.queryClient.ensureQueryData(queryOptions({queryKey:['page',params.page,deps],queryFn:()=>readPage({data:{page:params.page,...deps}})}));},
 head:({params})=>{const title=isPage(params.page)?pages[params.page]:'Halaman Tidak Ditemukan';return {meta:[{title:`${title} | KOCHI Inventory`},{name:'description',content:`${title} inventaris KOCHI / PT Nusa Jelita Lestari.`},{property:'og:title',content:`${title} | KOCHI Inventory`},{property:'og:description',content:`Kelola ${title.toLowerCase()} kantor KOCHI.`},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]};},
 component:Page,
 errorComponent:({error})=><div className="p-10"><h1 className="text-xl font-semibold">Halaman belum dapat dimuat</h1><p className="mt-3 text-sm">{error instanceof Error?error.message:'Silakan coba kembali.'}</p><a href="/dashboard" className="mt-4 block text-primary">Kembali ke Dashboard</a></div>,
 notFoundComponent:()=> <div className="p-10">Halaman tidak ditemukan.</div>
});
function Page(){const {page}=Route.useParams();const search=Route.useSearch();const {data:ws}=useSuspenseQuery(workspaceQuery);if(!isPage(page))return null;return <WorkspacePage page={page} search={search} ws={ws}/>;}
