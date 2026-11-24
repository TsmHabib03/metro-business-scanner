import {z} from 'zod';
import {cities,websiteLabels,prospectLabels,type Business} from '../shared/catalog.ts';
import {socialLinks} from '../shared/social.ts';
export function presentBusiness(row:Business):Business{return {...row,social_links:socialLinks(row.tags,row.social,row.website)};}
export function businessFilters(q:Record<string,string>){
 const values:unknown[]=[];const where:string[]=[];const add=(clause:string,value:unknown)=>{values.push(value);where.push(clause.replace('?',`$${values.length}`));};
 if(q.city)add('b.city=?',z.enum(cities).parse(q.city));if(q.category)add('b.category=?',z.string().max(100).parse(q.category));
 if(q.website)add('b.website_status=?',z.enum(Object.keys(websiteLabels) as [string,...string[]]).parse(q.website));
 if(q.status)add("coalesce(p.status,'new')=?",z.enum(Object.keys(prospectLabels) as [string,...string[]]).parse(q.status));
 if(q.saved==='true')where.push("coalesce(p.status,'new') NOT IN ('new','dismissed')");
 if(q.district)add('b.district ILIKE ?',`%${q.district.slice(0,200)}%`);if(q.barangay)add('b.barangay ILIKE ?',`%${q.barangay.slice(0,200)}%`);
 if(q.search)add("concat_ws(' ',b.name,b.address,b.city) ILIKE ?",`%${q.search.slice(0,200)}%`);
 if(q.bbox){const bounds=z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90),z.number().min(-180).max(180),z.number().min(-90).max(90)]).parse(q.bbox.split(',').map(Number));if(bounds[0]>=bounds[2]||bounds[1]>=bounds[3])throw new Error('Invalid map bounds.');const params=bounds.map(n=>{values.push(n);return `$${values.length}`;});where.push(`b.location && ST_MakeEnvelope(${params.join(',')},4326)`);}
 return {where:where.length?' WHERE '+where.join(' AND '):'',values};
}
