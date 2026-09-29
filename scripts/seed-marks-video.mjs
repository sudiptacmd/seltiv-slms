import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
await mongoose.connect('mongodb://127.0.0.1:27017/seltiv_slms');const db=mongoose.connection.db;
const klass=await db.collection('classes').findOne({numeric:8}),year=await db.collection('academicyears').findOne({isCurrent:true}),section=await db.collection('sections').findOne({klass:klass._id,name:'B'});
const subjects=await db.collection('subjects').find({klass:klass._id}).sort({order:1}).toArray();const science=subjects.find(s=>s.name==='Science');
const term=await db.collection('terms').findOne({year:year._id});const policy=await db.collection('markingstructures').findOne({subject:science._id,year:year._id});const allocation=policy?.allocations.find(a=>a.period==='pretest');if(!allocation)throw Error('Approve the Science pretest structure first.');
const enrollments=await db.collection('enrollments').find({section:section._id,year:year._id,status:'active'}).sort({rollNumber:1}).toArray();const students=await db.collection('students').find({_id:{$in:enrollments.map(e=>e.student)}}).toArray();
const assignment=await db.collection('subjectassignments').findOne({subject:science._id,section:section._id,year:year._id});const staff=await db.collection('staffs').findOne({_id:assignment.teacher});
const examId=new mongoose.Types.ObjectId();await db.collection('exams').insertOne({_id:examId,name:'Pretest Examination 2026',year:year._id,term:term._id,classes:[klass._id],markingPeriod:'pretest',resultPublished:false,routinePublished:false,createdAt:new Date(),updatedAt:new Date()});
for(const sub of subjects){await db.collection('examsubjects').insertOne({exam:examId,klass:klass._id,subject:sub._id,fullMarks:sub.fullMarks,passMarks:sub.passMarks,...(String(sub._id)===String(science._id)?{markingVersion:policy.version,markingComponents:allocation.components}:{markingVersion:0,markingComponents:[]}),createdAt:new Date(),updatedAt:new Date()});
for(const [i,e] of enrollments.entries()){
 const isScience=String(sub._id)===String(science._id),skip=isScience&&i<2;if(skip)continue;
 const pct=i===0?88+(sub.order%6):70+((i*7+sub.order*3)%24);const componentMarks={diary:5,attendance:9,weekly_test:19+(i%6),final_exam:43+(i%14)};
 await db.collection('marks').insertOne({exam:examId,section:section._id,subject:sub._id,student:e.student,obtained:isScience?Object.values(componentMarks).reduce((a,b)=>a+b,0):Math.round(sub.fullMarks*pct/100),...(isScience?{componentMarks}:{}),absent:false,exempt:false,createdAt:new Date(),updatedAt:new Date()});
}
 await db.collection('marksubmissions').insertOne({exam:examId,section:section._id,subject:sub._id,submitted:String(sub._id)!==String(science._id),locked:false,createdAt:new Date(),updatedAt:new Date()});
}
const teacherId=new mongoose.Types.ObjectId(),password=randomBytes(16).toString('hex'),email=`science-video-${Date.now()}@seltiv.demo`;
await db.collection('users').insertOne({_id:teacherId,name:staff?.name??'Science Teacher',phone:`+88019${String(Date.now()).slice(-8)}`,email,passwordHash:await bcrypt.hash(password,10),roles:['teacher'],permissions:[],staff:assignment.teacher,active:true,mustChangePassword:false,isClassTeacher:false,createdAt:new Date(),updatedAt:new Date()});
await fs.mkdir('storage/marks-video',{recursive:true});
await fs.writeFile('storage/marks-video/context.json',JSON.stringify({examId:String(examId),sectionId:String(section._id),subjectId:String(science._id),teacherId:String(teacherId),email,password,students:enrollments.slice(0,2).map(e=>({id:String(e.student),name:students.find(s=>String(s._id)===String(e.student)).name})),count:enrollments.length},null,2));
console.log('Prepared separate demo exam with',enrollments.length,'synthetic students. Two Science rows ready for on-screen entry.');await mongoose.disconnect();
