#!/usr/bin/env node
import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

function workspaceRoot(){let current=process.cwd();while(!existsSync(path.join(current,'pnpm-workspace.yaml'))){const parent=path.dirname(current);if(parent===current)throw new Error('pnpm-workspace.yaml が見つかりません');current=parent}return current}
const root=workspaceRoot();
const evalRoot=path.join(root,'evals','clip_composition');
const outputRoot=path.join(evalRoot,'outputs','human-boundary-trim','20260717-first-gate-unseen-formal-v001');
const videoPath=path.join(evalRoot,'research','downloads','first-gate-unseen','DmWu0jVQfTE','DmWu0jVQfTE.mp4');
const wordsPath=path.join(evalRoot,'stt','DmWu0jVQfTE_first_gate_unseen_local120_v001','source','word-timestamps.json');
const transcriptPath=path.join(evalRoot,'stt','DmWu0jVQfTE_first_gate_unseen_local120_v001','source','transcript.json');
const host='127.0.0.1';
const port=Number(process.argv.find(x=>x.startsWith('--port='))?.split('=')[1]??4318);
let sourcePromise;
async function source(){if(!sourcePromise)sourcePromise=Promise.all([readFile(wordsPath,'utf8').then(JSON.parse),readFile(transcriptPath,'utf8').then(JSON.parse)]).then(([wordData,transcript])=>({words:wordData.words??[],durationMs:Math.round(transcript.originalDurationSec*1000)}));return sourcePromise}
function utterances(words){const rows=[];let current=[];const flush=()=>{if(!current.length)return;const text=current.map(x=>String(x.text??'')).join('');if(text.trim())rows.push({startMs:current[0].startMs,endMs:current.at(-1).endMs,text,tokens:current.map((x,i)=>({id:`${x.segmentId??'token'}-${i}-${x.startMs}`,text:String(x.text??''),startMs:x.startMs,endMs:x.endMs}))});current=[]};for(const word of words){if(!String(word.text??''))continue;if(current.length&&word.startMs-current.at(-1).endMs>=1200)flush();current.push(word);if(/[。！？!?]$/.test(String(word.text??'')))flush()}flush();return rows}
async function serveWindow(res,url){const data=await source();const startMs=Math.max(0,Number(url.searchParams.get('startMs'))||0);const endMs=Math.min(data.durationMs,Number(url.searchParams.get('endMs'))||data.durationMs);if(!(startMs<endMs)){res.writeHead(400,{'content-type':'application/json; charset=utf-8'}).end(JSON.stringify({error:'範囲が不正です'}));return}const words=data.words.filter(x=>x.endMs>=startMs&&x.startMs<=endMs);res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify({startMs,endMs,utterances:utterances(words)}))}
async function serveVideo(req,res){if(!existsSync(videoPath)){res.writeHead(404).end('video not found');return}const info=await stat(videoPath);const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');if(!match){res.writeHead(200,{'content-type':'video/mp4','content-length':info.size,'accept-ranges':'bytes'});createReadStream(videoPath).pipe(res);return}const start=Number(match[1]);const end=match[2]?Math.min(Number(match[2]),info.size-1):info.size-1;if(start>end||start>=info.size){res.writeHead(416,{'content-range':`bytes */${info.size}`}).end();return}res.writeHead(206,{'content-type':'video/mp4','content-length':end-start+1,'content-range':`bytes ${start}-${end}/${info.size}`,'accept-ranges':'bytes'});createReadStream(videoPath,{start,end}).pipe(res)}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${host}:${port}`);if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(await readFile(path.join(outputRoot,'index.html')));return}if(req.method==='GET'&&url.pathname==='/video'){await serveVideo(req,res);return}if(req.method==='GET'&&url.pathname==='/api/transcript-window'){await serveWindow(res,url);return}res.writeHead(404).end('not found')}catch(error){res.writeHead(500,{'content-type':'text/plain; charset=utf-8'}).end(error.message)}});
server.listen(port,host,()=>console.log(JSON.stringify({status:'ready',url:`http://${host}:${port}/`,mode:'read-only-source; browser-local-reversible-draft; no-human-time-measurement; copy-result'},null,2)));
