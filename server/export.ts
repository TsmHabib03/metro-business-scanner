import ExcelJS from 'exceljs';
import type { Business } from '../shared/catalog.ts';
import { policy } from './policy.ts';
export const licenseNotice = `OpenStreetMap-derived business records\n${policy.attribution}\nDatabase license: https://opendatacommons.org/licenses/odbl/1-0/\nSource: OpenStreetMap via the transport and snapshot identified in each record\nCopyright: ${policy.licenseUrl}\nThese records include OSM business facts and are provided under ODbL 1.0. Preserve attribution and comply with share-alike obligations when publicly distributing a derivative database. User-authored prospect status and notes are omitted from this OSM data export. A missing website field does not prove absence of a website. Business listings do not establish government registration.`;
const columns=['name','category','city','address','district','barangay','lat','lon','website','phone','email','social','social_links','website_status','website_reason','checked_at','source_url','osm_type','osm_id','discovered_at','updated_at','tags'] as const;
export function safeCell(value:unknown) {const text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);return /^[\s]*[=+@-]/.test(text)?`'${text}`:text;}
export function csv(rows:Business[],transport=policy.endpoint) {
 const escape=(v:unknown)=>`"${safeCell(v).replaceAll('"','""')}"`;
 return '\uFEFF'+[[...columns,'attribution','database_license','discovery_transport'].join(','),...rows.map(r=>[...columns.map(c=>escape(r[c])),escape(policy.attribution),escape('https://opendatacommons.org/licenses/odbl/1-0/'),escape(r.tags?.['scanner:transport']||transport)].join(','))].join('\r\n');
}
export async function xlsx(rows:Business[],transport=policy.endpoint) {
 const book=new ExcelJS.Workbook();book.creator='Metro Manila Business Scanner';
 const sheet=book.addWorksheet('OSM businesses');sheet.columns=columns.map(key=>({header:key,key,width:key==='name'?38:24}));
 rows.forEach(row=>sheet.addRow(Object.fromEntries(columns.map(c=>[c,safeCell(row[c])]))));
 sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).font={bold:true};sheet.autoFilter={from:'A1',to:'V1'};
 const license=book.addWorksheet('License & attribution');license.getColumn(1).width=120;(licenseNotice+'\nActive discovery transport: '+transport).split('\n').forEach(line=>license.addRow([line]));
 return Buffer.from(await book.xlsx.writeBuffer());
}
