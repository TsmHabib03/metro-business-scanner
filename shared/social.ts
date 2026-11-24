export const socialPlatforms = {
 facebook: {label:'Facebook',hosts:['facebook.com','fb.com','fb.me'],base:'https://www.facebook.com/'},
 instagram: {label:'Instagram',hosts:['instagram.com'],base:'https://www.instagram.com/'},
 tiktok: {label:'TikTok',hosts:['tiktok.com'],base:'https://www.tiktok.com/@'},
 youtube: {label:'YouTube',hosts:['youtube.com','youtu.be'],base:'https://www.youtube.com/@'},
 linkedin: {label:'LinkedIn',hosts:['linkedin.com'],base:'https://www.linkedin.com/company/'},
 twitter: {label:'X / Twitter',hosts:['twitter.com','x.com'],base:'https://x.com/'},
 whatsapp: {label:'WhatsApp',hosts:['wa.me','whatsapp.com'],base:'https://wa.me/'},
 telegram: {label:'Telegram',hosts:['t.me','telegram.me'],base:'https://t.me/'},
} as const;
export type SocialPlatform=keyof typeof socialPlatforms;
export interface SocialLink {platform:SocialPlatform;url:string;source_field:string}
export function safeExternal(raw:string):string|undefined {
 if(!raw||raw.length>2048||/[\s\u0000-\u001f]/.test(raw)||(/^[a-z][a-z0-9+.-]*:/i.test(raw)&&!/^https?:\/\//i.test(raw)))return;
 try {const u=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port)return;return u.href;}catch{return;}
}
export function socialPlatform(raw:string):SocialPlatform|undefined {
 const url=safeExternal(raw);if(!url)return;
 const host=new URL(url).hostname.toLowerCase();
 return (Object.keys(socialPlatforms) as SocialPlatform[]).find(p=>socialPlatforms[p].hosts.some(h=>host===h||host.endsWith(`.${h}`)));
}
function normalize(raw:string,platform?:SocialPlatform):string|undefined {
 raw=raw.trim();let url=safeExternal(raw);
 if(platform&&(!url||socialPlatform(url)!==platform)){
  if(platform==='whatsapp'&&/^\+?[0-9 ()-]{6,25}$/.test(raw))url=socialPlatforms.whatsapp.base+raw.replace(/\D/g,'');
  else if(/^@?[a-zA-Z0-9_.-]{1,100}$/.test(raw)&&!raw.includes('..')&&!/(?:facebook|instagram|tiktok|youtube|linkedin|twitter|whatsapp|telegram|https?)\./i.test(raw)&&!/(?:\.(?:com|org|net|ph|io|me|co|dev))$/i.test(raw))url=socialPlatforms[platform].base+raw.replace(/^@/,'');
  else return;
 }
 if(!url||!socialPlatform(url)||(platform&&socialPlatform(url)!==platform))return;
 const u=new URL(url);u.protocol='https:';u.hash='';
 for(const key of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^igshid$/.test(key))u.searchParams.delete(key);
 return u.href;
}
export function socialLinks(tags:Record<string,string>={},legacy='',website=''):SocialLink[]{
 const links:SocialLink[]=[];const seen=new Set<string>();
 function add(raw:string,field:string,expected?:SocialPlatform){
  for(const part of raw.split(';')){const url=normalize(part,expected);if(!url)continue;const platform=socialPlatform(url)!;const u=new URL(url);const host=platform==='twitter'?'x.com':u.hostname.replace(/^(www\.|m\.)/,'');const key=`${host}${u.pathname.replace(/\/$/,'')}${u.search}`;if(seen.has(key))continue;seen.add(key);links.push({platform,url,source_field:field});}
 }
 for(const platform of Object.keys(socialPlatforms) as SocialPlatform[]){for(const field of [`contact:${platform}`,platform,...(platform==='twitter'?['contact:x','x']:[])])if(tags[field])add(tags[field],field,platform);}
 for(const field of ['website','contact:website'])if(tags[field])add(tags[field],field);
 if(legacy)add(legacy,'social');if(website)add(website,'website');
 return links;
}
