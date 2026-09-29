const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let titles=[],seasons=[],episodes=[], mode="", editing=null;

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function boot(){
 const {data:{session}}=await sb.auth.getSession();
 if(session) showApp(); else $("#loginView").classList.remove("hidden");
}
$("#loginForm").onsubmit=async e=>{e.preventDefault();$("#loginError").textContent="";const {error}=await sb.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});if(error)$("#loginError").textContent=error.message;else showApp()};
async function logout(){await sb.auth.signOut();location.reload()}
$("#logout").onclick=logout;$("#mobileLogout").onclick=logout;
$$("aside button[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
function showApp(){$("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");showView("dashboard")}
function showView(v){$$(".view").forEach(x=>x.classList.add("hidden"));$("#"+v).classList.remove("hidden"); if(v==="dashboard")loadAll();if(v==="titles")loadTitles();if(v==="seasons")loadSeasons();if(v==="episodes")loadEpisodes()}

async function loadAll(){await Promise.all([loadTitles(),loadSeasons(),loadEpisodes()]);$("#statTitles").textContent=titles.length;$("#statMovies").textContent=titles.filter(x=>x.type==="movie").length;$("#statSeries").textContent=titles.filter(x=>x.type==="series").length;$("#statEpisodes").textContent=episodes.length}
async function loadTitles(){let r=await sb.from("titles").select("*").order("created_at",{ascending:false});if(r.error)return alert(r.error.message);titles=r.data||[];$("#titleList").innerHTML=`<table><tr><th>Poster</th><th>Title</th><th>Type</th><th>Year</th><th>Published</th><th></th></tr>${titles.map(t=>`<tr><td><img class="thumb" src="${esc(t.poster_url||"assets/placeholder.svg")}"></td><td>${esc(t.title)}</td><td>${esc(t.type)}</td><td>${esc(t.year||"")}</td><td>${t.published?"Yes":"No"}</td><td><button onclick="editTitle('${t.id}')">Edit</button> <button class="danger" onclick="del('titles','${t.id}')">Delete</button></td></tr>`).join("")}</table>`}
async function loadSeasons(){let r=await sb.from("seasons").select("*,titles(title)").order("season_number");seasons=r.data||[];$("#seasonList").innerHTML=`<table><tr><th>Series</th><th>Season</th><th>Name</th><th></th></tr>${seasons.map(s=>`<tr><td>${esc(s.titles?.title)}</td><td>${s.season_number}</td><td>${esc(s.name||"")}</td><td><button onclick="editSeason('${s.id}')">Edit</button> <button class="danger" onclick="del('seasons','${s.id}')">Delete</button></td></tr>`).join("")}</table>`}
async function loadEpisodes(){let r=await sb.from("episodes").select("*,seasons(name,season_number,titles(title))").order("episode_number");episodes=r.data||[];$("#episodeList").innerHTML=`<table><tr><th>Series</th><th>Season</th><th>Episode</th><th>Title</th><th></th></tr>${episodes.map(e=>`<tr><td>${esc(e.seasons?.titles?.title)}</td><td>${e.seasons?.season_number||""}</td><td>${e.episode_number}</td><td>${esc(e.title||"")}</td><td><button onclick="editEpisode('${e.id}')">Edit</button> <button class="danger" onclick="del('episodes','${e.id}')">Delete</button></td></tr>`).join("")}</table>`}

function field(name,label,type="text",value="",extra=""){return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`}
function openEditor(title,fields,saveMode,id=null){mode=saveMode;editing=id;$("#editorTitle").textContent=title;$("#editorFields").innerHTML=fields;$("#editorError").textContent="";$("#editor").classList.remove("hidden")}
function select(name,label,opts,val=""){return `<label>${label}<select name="${name}">${opts.map(o=>`<option value="${esc(o.value)}" ${o.value==val?"selected":""}>${esc(o.label)}</option>`).join("")}</select></label>`}

function resetTitleExtras(){
 $("#posterFile").value="";
 $("#posterPreview").innerHTML="";
 $("#link480").value=""; $("#link720").value=""; $("#link1080").value="";
}
function showPosterPreview(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>$("#posterPreview").innerHTML=`<img src="${reader.result}" alt="Poster preview">`;
 reader.readAsDataURL(file);
}
$("#posterFile").onchange=()=>showPosterPreview($("#posterFile").files[0]);

$("#newTitle").onclick=()=>{
 openEditor("Add movie / series",
 field("title","Title","text","", "required")+
 select("type","Type",[{value:"movie",label:"Movie"},{value:"series",label:"Series"}])+
 field("year","Year","number","")+
 field("genre","Genres","text","Action, Drama")+
 field("rating","Rating","number","0","step='0.1' min='0' max='10'")+
 `<label>Description<textarea name="description"></textarea></label>`+
 `<label>Published <input name="published" type="checkbox" checked></label>`,
 "title");
 $("#posterUploadBox").classList.remove("hidden");
 $("#qualityLinksBox").classList.remove("hidden");
 resetTitleExtras();
};

window.editTitle=async id=>{
 const t=titles.find(x=>x.id===id);
 const {data:links}=await sb.from("download_links").select("*").eq("title_id",id);
 const q=Object.fromEntries((links||[]).map(x=>[x.quality,x.url]));
 openEditor("Edit title",
 field("title","Title","text",t.title,"required")+
 select("type","Type",[{value:"movie",label:"Movie"},{value:"series",label:"Series"}],t.type)+
 field("year","Year","number",t.year||"")+
 field("genre","Genres","text",t.genre||"")+
 field("rating","Rating","number",t.rating||0,"step='0.1' min='0' max='10'")+
 `<label>Description<textarea name="description">${esc(t.description||"")}</textarea></label>`+
 `<label>Published <input name="published" type="checkbox" ${t.published?"checked":""}></label>`,
 "title",id);
 $("#posterUploadBox").classList.remove("hidden");
 $("#qualityLinksBox").classList.remove("hidden");
 resetTitleExtras();
 if(t.poster_url) $("#posterPreview").innerHTML=`<img src="${esc(t.poster_url)}" alt="Current poster">`;
 $("#link480").value=q["480p"]||"";
 $("#link720").value=q["720p"]||"";
 $("#link1080").value=q["1080p"]||"";
};

$("#newSeason").onclick=()=>openEditor("Add season",select("title_id","Series",titles.filter(t=>t.type==="series").map(t=>({value:t.id,label:t.title})))+field("season_number","Season number","number","1","required min='1'")+field("name","Name"),"season");
window.editSeason=id=>{const s=seasons.find(x=>x.id===id);openEditor("Edit season",select("title_id","Series",titles.filter(t=>t.type==="series").map(t=>({value:t.id,label:t.title})),s.title_id)+field("season_number","Season number","number",s.season_number,"required min='1'")+field("name","Name","text",s.name||""),"season",id)}
$("#newEpisode").onclick=()=>openEditor("Add episode",select("season_id","Season",seasons.map(s=>({value:s.id,label:(s.titles?.title||"Series")+" — S"+s.season_number})))+field("episode_number","Episode number","number","1","required min='1'")+field("title","Episode title")+`<label>Description<textarea name="description"></textarea></label><label>Video URL<input name="video_url"></label><p class="hint">Download links are added separately after the episode is created.</p>`,"episode");
window.editEpisode=id=>{const e=episodes.find(x=>x.id===id);openEditor("Edit episode",select("season_id","Season",seasons.map(s=>({value:s.id,label:(s.titles?.title||"Series")+" — S"+s.season_number})),e.season_id)+field("episode_number","Episode number","number",e.episode_number,"required min='1'")+field("title","Episode title","text",e.title||"")+`<label>Description<textarea name="description">${esc(e.description||"")}</textarea></label><label>Video URL<input name="video_url" value="${esc(e.video_url||"")}"></label>`,"episode",id)}
async function uploadPoster(file){
 if(!file)return null;
 const {data:{user}}=await sb.auth.getUser();
 if(!user)throw new Error("Session expired. Please sign in again.");
 const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");
 const path=`${user.id}/${crypto.randomUUID()}-${safe}`;
 const {error}=await sb.storage.from("posters").upload(path,file,{upsert:false,contentType:file.type});
 if(error)throw error;
 return sb.storage.from("posters").getPublicUrl(path).data.publicUrl;
}
async function saveTitleLinks(titleId){
 const urls={480p:$("#link480").value.trim(),720p:$("#link720").value.trim(),1080p:$("#link1080").value.trim()};
 for(const [quality,url] of Object.entries(urls)){
   const {data:old}=await sb.from("download_links").select("id").eq("title_id",titleId).eq("quality",quality).maybeSingle();
   if(url){
     const r=old
       ? await sb.from("download_links").update({url}).eq("id",old.id)
       : await sb.from("download_links").insert({title_id:titleId,quality,url});
     if(r.error)throw r.error;
   }else if(old){
     const r=await sb.from("download_links").delete().eq("id",old.id);
     if(r.error)throw r.error;
   }
 }
}
$("#editorForm").onsubmit=async e=>{
 e.preventDefault();$("#editorError").textContent="";
 try{
   const fd=new FormData(e.target),o=Object.fromEntries(fd.entries());
   o.published=fd.has("published");
   ["year","rating","season_number","episode_number"].forEach(k=>{if(k in o)o[k]=o[k]===""?null:Number(o[k])});
   const table=mode==="title"?"titles":mode==="season"?"seasons":"episodes";
   if(mode==="title"){
     const file=$("#posterFile").files[0];
     if(file)o.poster_url=await uploadPoster(file);
     const r=editing
       ? await sb.from("titles").update(o).eq("id",editing).select().single()
       : await sb.from("titles").insert(o).select().single();
     if(r.error)throw r.error;
     await saveTitleLinks(r.data.id);
   }else{
     const r=editing?await sb.from(table).update(o).eq("id",editing):await sb.from(table).insert(o);
     if(r.error)throw r.error;
   }
   $("#editor").classList.add("hidden");showView(table);
 }catch(err){$("#editorError").textContent=err.message||String(err)}
};

window.del=async(table,id)=>{if(!confirm("Delete this item?"))return;const {error}=await sb.from(table).delete().eq("id",id);if(error)alert(error.message);else showView(table)}
$("#closeEditor").onclick=()=>$("#editor").classList.add("hidden");
boot();