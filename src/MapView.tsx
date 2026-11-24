import {useEffect,useRef,useState} from 'react';
import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {Expand,LoaderCircle,Layers,MapPin,X} from 'lucide-react';
import {websiteLabels,type MapData} from '../shared/catalog.ts';
ml.setWorkerUrl(workerUrl);
const colors:Record<string,string>={not_listed:'#b67d25',social_only:'#8062a5',existing:'#2d8062',unavailable:'#b34f43',review:'#637780'};
export default function MapView({data,selected,onSelect,pending,onBounds}:{data:MapData;selected:string;onSelect:(id:string)=>void;pending:boolean;onBounds:(bounds:string)=>void}){
 const container=useRef<HTMLDivElement>(null),map=useRef<ml.Map|null>(null),latest=useRef({data,selected,onSelect,onBounds});latest.current={data,selected,onSelect,onBounds};
 const [error,setError]=useState(''),[ready,setReady]=useState(false),[tiles,setTiles]=useState(false),[nearby,setNearby]=useState<{id:string;name:string}[]>([]),[retry,setRetry]=useState(0);
 const update=useRef<()=>void>(()=>{});const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function fit(){const m=map.current;if(!m||!latest.current.data.features.length)return;const bounds=new ml.LngLatBounds();latest.current.data.features.forEach(f=>bounds.extend(f.geometry.coordinates));m.fitBounds(bounds,{padding:70,maxZoom:15,duration:reduced()?0:500});}
 useEffect(()=>{
  if(!container.current)return;setError('');setReady(false);setNearby([]);
  try{
   const m=new ml.Map({container:container.current,center:[121.025,14.61],zoom:10,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#edf2f0'}}]},attributionControl:{compact:true,customAttribution:'© OpenStreetMap contributors · ODbL 1.0'}});map.current=m;m.addControl(new ml.NavigationControl({showCompass:false}),'top-right');let fitted=false;let previous=latest.current.data;
   update.current=()=>{const source=m.getSource('businesses') as ml.GeoJSONSource|undefined;if(!source)return;const current=latest.current; if(current.data!==previous||!fitted){source.setData({type:'FeatureCollection',features:current.data.features});previous=current.data;}const selectedFeature=current.data.features.find(f=>f.properties.id===current.selected);(m.getSource('selection') as ml.GeoJSONSource).setData({type:'FeatureCollection',features:selectedFeature?[selectedFeature]:[]});if(!fitted&&current.data.features.length){fitted=true;fit();}};
   m.on('load',()=>{
    m.addSource('businesses',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterRadius:38,clusterMaxZoom:14});m.addSource('selection',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    m.addLayer({id:'clusters',type:'circle',source:'businesses',filter:['has','point_count'],paint:{'circle-color':'#244f54','circle-radius':['step',['get','point_count'],17,20,22,100,28],'circle-stroke-color':'#fff','circle-stroke-width':2}});
    // DOM count labels avoid dependence on an unlicensed external glyph service.
    m.addLayer({id:'records',type:'circle',source:'businesses',filter:['!', ['has','point_count']],paint:{'circle-color':['match',['get','website_status'],...Object.entries(colors).flat(), '#637780'] as unknown as ml.ExpressionSpecification,'circle-radius':7,'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
    m.addLayer({id:'selected',type:'circle',source:'selection',paint:{'circle-radius':12,'circle-color':'#0b665e','circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    const labels=new Map<string,ml.Marker>();
    const updateCounts=()=>{const visible=new Set<string>();for(const f of m.querySourceFeatures('businesses',{filter:['has','point_count']})){const id=String(f.properties?.cluster_id);if(visible.has(id))continue;visible.add(id);if(!labels.has(id)&&f.geometry.type==='Point'){const el=document.createElement('span');el.className='cluster-label';el.textContent=String(f.properties.point_count_abbreviated);labels.set(id,new ml.Marker({element:el}).setLngLat(f.geometry.coordinates as [number,number]).addTo(m));}}for(const [id,label]of labels)if(!visible.has(id)){label.remove();labels.delete(id);}};m.on('idle',updateCounts);m.on('move',updateCounts);
    m.on('click','clusters',async e=>{const f=e.features?.[0];if(!f||f.geometry.type!=='Point')return;try{const zoom=await (m.getSource('businesses') as ml.GeoJSONSource).getClusterExpansionZoom(Number(f.properties.cluster_id));m.easeTo({center:f.geometry.coordinates as [number,number],zoom,duration:reduced()?0:400});}catch{setError('Could not expand this cluster. Use the business list.');}});
    m.on('click','records',e=>{const f=e.features?.[0];if(!f||f.geometry.type!=='Point')return;const [lon,lat]=f.geometry.coordinates;const matches=latest.current.data.features.filter(p=>Math.abs(p.geometry.coordinates[0]-lon)<.000001&&Math.abs(p.geometry.coordinates[1]-lat)<.000001);setNearby(matches.length>1?matches.map(p=>p.properties):[]);latest.current.onSelect(String(f.properties.id));});
    for(const layer of ['records','clusters']){m.on('mouseenter',layer,()=>{m.getCanvas().style.cursor='pointer';});m.on('mouseleave',layer,()=>{m.getCanvas().style.cursor='';});}
    m.on('idle',()=>{if(container.current)container.current.dataset.loadedPoints=String(latest.current.data.features.length);});update.current();setReady(true);
   });
   m.on('error',()=>setError('Some map content could not load. Business records remain available in the list.'));
   const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
   return()=>{resize.disconnect();update.current=()=>{};m.remove();map.current=null;};
  }catch{setError('The map could not start. Use the business list or retry.');}
 },[retry]);
 useEffect(()=>{update.current();},[data,selected]);
 useEffect(()=>{const f=data.features.find(f=>f.properties.id===selected);if(f&&map.current)map.current.easeTo({center:f.geometry.coordinates,zoom:Math.max(map.current.getZoom(),15),duration:reduced()?0:450});},[selected]);
 function enableTiles(){const m=map.current;if(!m||!ready||tiles)return;const url=import.meta.env.VITE_MAP_TILE_URL as string|undefined;if(!url&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){setError('Configure an approved street-map provider for this deployment.');return;}m.addSource('streets',{type:'raster',tiles:[url||'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:import.meta.env.VITE_MAP_ATTRIBUTION||'© OpenStreetMap contributors'});m.addLayer({id:'streets',type:'raster',source:'streets'},'clusters');setTiles(true);}
 return <div className="map-wrap" aria-busy={!ready||pending}><div ref={container} className="map" aria-label="Business location map"/>
  <div className="map-actions"><button className="secondary small" onClick={fit} disabled={!ready||!data.features.length}><Expand size={15}/>Fit results</button><button className="secondary small" disabled={!ready} onClick={()=>{const b=map.current!.getBounds();onBounds([Math.max(-180,b.getWest()),Math.max(-90,b.getSouth()),Math.min(180,b.getEast()),Math.min(90,b.getNorth())].join(','));}}><MapPin size={15}/>Filter visible area</button>{!tiles&&<button className="secondary small" disabled={!ready} onClick={enableTiles}><Layers size={15}/>Show streets</button>}</div>
  {(!ready&&!error)&&<div className="map-loading" role="status"><LoaderCircle className="spin" size={22}/>Starting interactive map...</div>}{pending&&ready&&<div className="map-updating" role="status"><LoaderCircle size={14} className="spin"/>Updating map results</div>}
  {error&&<div className="map-notice" role="alert">{error}<button className="text-button" onClick={()=>{setTiles(false);setRetry(r=>r+1);}}>Retry map</button><button aria-label="Dismiss map error" onClick={()=>setError('')}><X size={15}/></button></div>}
  {!pending&&!data.features.length&&ready&&<div className="map-loading"><MapPin size={24}/><span>No mapped businesses match your filters.</span></div>}
  {!!nearby.length&&<div className="nearby"><strong>Businesses at this point</strong><button className="icon-button" aria-label="Close nearby businesses" onClick={()=>setNearby([])}><X size={15}/></button>{nearby.map(r=><button key={r.id} onClick={()=>onSelect(r.id)}>{r.name}</button>)}</div>}
  <div className="map-legend">{Object.entries(websiteLabels).map(([key,label])=><span key={key}><i style={{background:colors[key]}}/>{label}</span>)}</div>
  <div className="map-caption"><span>{pending?'Updating...':`${data.features.length.toLocaleString()} mapped businesses`}{!pending&&!!data.missing_coordinates&&` · ${data.missing_coordinates} without coordinates`}{!pending&&!data.complete&&' · Partial results: narrow your filters'}</span><span>{tiles?'Street map enabled':'Streets load when requested'} · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></span></div>
 </div>;
}
