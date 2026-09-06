import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {spawn} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_URL_LENGTH = Number(process.env.MAX_URL_LENGTH || 2000);

app.use(cors({origin: process.env.CORS_ORIGIN || "*"}));
app.use(express.json({limit:"32kb"}));

const allowedHosts = [
  "youtube.com","youtu.be","tiktok.com","instagram.com","facebook.com","fb.watch"
];

function validUrl(raw){
  if(typeof raw !== "string" || raw.length > MAX_URL_LENGTH) return null;
  try{
    const u = new URL(raw);
    if(!["http:","https:"].includes(u.protocol)) return null;
    const h = u.hostname.toLowerCase().replace(/^www\\./,"");
    if(!allowedHosts.some(x => h === x || h.endsWith("."+x))) return null;
    return u.toString();
  }catch{return null}
}

function runYtdlp(args){
  return new Promise((resolve,reject)=>{
    const p = spawn("yt-dlp", args, {stdio:["ignore","pipe","pipe"]});
    let out="", err="";
    p.stdout.on("data",d=>out+=d.toString());
    p.stderr.on("data",d=>err+=d.toString());
    p.on("error",reject);
    p.on("close",code=>code===0?resolve(out):reject(new Error(err.slice(-4000)||`yt-dlp exit ${code}`)));
  });
}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"MediaForge"}));

app.post("/api/info", async (req,res)=>{
  const url = validUrl(req.body?.url);
  if(!url) return res.status(400).json({error:"URL tidak didukung."});
  try{
    const raw = await runYtdlp(["--dump-single-json","--no-warnings","--skip-download",url]);
    const x = JSON.parse(raw);
    res.json({
      title:x.title || "Media",
      platform:x.extractor_key || x.extractor || "Media",
      duration:x.duration_string || "",
      thumbnail:x.thumbnail || "",
      width:x.width || null,
      height:x.height || null
    });
  }catch(e){
    res.status(502).json({error:"Gagal membaca metadata media.",detail:e.message});
  }
});

app.post("/api/download", async (req,res)=>{
  const url = validUrl(req.body?.url);
  if(!url) return res.status(400).send("URL tidak didukung.");

  const format = ["video","audio","image"].includes(req.body?.format) ? req.body.format : "video";
  const quality = ["best","1080","720","480","360"].includes(String(req.body?.quality)) ? String(req.body.quality) : "720";
  const audioFormat = ["mp3","m4a"].includes(req.body?.audioFormat) ? req.body.audioFormat : "mp3";

  const dir = fs.mkdtempSync(path.join(os.tmpdir(),"mediaforge-"));
  const id = crypto.randomBytes(8).toString("hex");
  const out = path.join(dir, `${id}.%(ext)s`);

  let args = ["--no-warnings","--no-playlist","--restrict-filenames","-o",out];

  if(format === "audio"){
    args.push("-x","--audio-format",audioFormat);
  } else if(format === "image"){
    args.push("--write-thumbnail","--skip-download");
  } else {
    const fmt = quality === "best"
      ? "bv*+ba/b"
      : `bv*[height<=${quality}]+ba/b[height<=${quality}]`;
    args.push("-f",fmt,"--merge-output-format","mp4");
  }

  args.push(url);

  try{
    await runYtdlp(args);
    const candidates = fs.readdirSync(dir).filter(x=>x !== "." && x !== "..");
    if(!candidates.length) throw new Error("File hasil tidak ditemukan.");
    const file = path.join(dir,candidates[0]);
    const ext = path.extname(file).toLowerCase();
    const base = "mediaforge-download" + ext;
    res.download(file,base,()=>fs.rmSync(dir,{recursive:true,force:true}));
  }catch(e){
    fs.rmSync(dir,{recursive:true,force:true});
    res.status(502).send(`Download gagal: ${e.message}`);
  }
});

app.use((err,req,res,next)=>{
  console.error(err);
  res.status(500).json({error:"Internal server error"});
});

app.listen(PORT,()=>console.log(`MediaForge backend listening on :${PORT}`));
