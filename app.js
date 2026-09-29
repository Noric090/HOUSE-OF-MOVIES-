const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
const movieGrid=document.querySelector("#movieGrid"), seriesGrid=document.querySelector("#seriesGrid"), modal=document.querySelector("#modal"), modalContent=document.querySelector("#modalContent"), genreFilter=document.querySelector("#genreFilter");
let titles=[];

document.querySelector("#year").textContent=new Date().getFullYear();
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function card(t){return `<article class="card" data-id="${t.id}"><img src="${esc(t.poster_url||"assets/placeholder.svg")}" alt="${esc(t.title)}"><div class="card-body"><span>${esc(t.type)} • ${esc(t.year||"")}</span><h3>${esc(t.title)}</h3><p>${esc(t.genre||"")}</p></div></article>`}
function render(list=titles){
 movieGrid.innerHTML=list.filter(x=>x.type==="movie").map(card).join("")||'<div class="empty">No movies found.</div>';
 seriesGrid.innerHTML=list.filter(x=>x.type==="series").map(card).join("")||'<div class="empty">No series found.</div>';
 document.querySelectorAll(".card").forEach(c=>c.onclick=()=>openDetails(c.dataset.id));
}
async function load(){
 const {data,error}=await sb.from("titles").select("*").eq("published",true).order("created_at",{ascending:false});
 if(error){showToast(error.message);return}
 titles=data||[];
 const genres=[...new Set(titles.flatMap(x=>(x.genre||"").split(",").map(g=>g.trim()).filter(Boolean)))].sort();
 genreFilter.innerHTML='<option value="">All genres</option>'+genres.map(g=>`<option>${esc(g)}</option>`).join("");
 render();
}
async function openDetails(id){
 const t=titles.find(x=>x.id===id); if(!t)return;
 let links="", eps="";
 const {data:seasons}=await sb.from("seasons").select("*").eq("title_id",id).order("season_number");
 if(seasons?.length){
  for(const s of seasons){
   const {data:e}=await sb.from("episodes").select("*,download_links(*)").eq("season_id",s.id).order("episode_number");
   eps+=`<h3>Season ${s.season_number}</h3>`+(e||[]).map(ep=>`<div class="episode"><b>${esc(ep.episode_number)}. ${esc(ep.title||"Episode")}</b>${(ep.download_links||[]).map(l=>`<a class="quality" href="${esc(l.url)}" target="_blank" rel="noopener">Download ${esc(l.quality)}</a>`).join("")}</div>`).join("");
  }
 } else {
  const {data:l}=await sb.from("download_links").select("*").eq("title_id",id).order("quality");
  links=(l||[]).map(x=>`<a class="quality" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.quality)}</a>`).join("");
 }
 modalContent.innerHTML=`<div class="detail"><img src="${esc(t.poster_url||"assets/placeholder.svg")}"><div><p class="eyebrow">${esc(t.type)} • ${esc(t.year||"")}</p><h2>${esc(t.title)}</h2><p>${esc(t.description||"No description yet.")}</p><div class="downloads">${links||eps||"<p>No download links added yet.</p>"}</div></div></div>`;
 modal.classList.remove("hidden");
}
genreFilter.onchange=()=>{const g=genreFilter.value.toLowerCase();render(g?titles.filter(t=>(t.genre||"").toLowerCase().split(",").map(x=>x.trim()).includes(g)):titles)}
document.querySelector("#searchBtn").onclick=()=>search();
document.querySelector("#searchInput").oninput=()=>search();
function search(){const q=document.querySelector("#searchInput").value.trim().toLowerCase();render(q?titles.filter(t=>(t.title+" "+t.genre+" "+t.description).toLowerCase().includes(q)):titles)}
document.querySelector("#closeModal").onclick=()=>modal.classList.add("hidden");
modal.onclick=e=>{if(e.target===modal)modal.classList.add("hidden")};
function showToast(m){const t=document.querySelector("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000)}
load();