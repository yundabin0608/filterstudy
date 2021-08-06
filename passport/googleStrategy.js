const User=require('../models/user');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const { default: axios } = require('axios');
const nodemailer = require('nodemailer');
let flag = false;

module.exports=()=>{
    passport.use(new GoogleStrategy({
        clientID:process.env.GOOGLE_ID, 
        clientSecret:process.env.GOOGLE_SECRET,
        callbackURL:'/auth/google/callback',
    },async(req,res,profile,done)=>{ 
        try{
            const exUser=await User.findOne({
                where:{
                    snsID:profile.id,
                    provider:'google'
                },
            });
            if(exUser){//이미 회원가입한 유저
                done(null,exUser);
            } else {
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    host: 'smtp.gmail.com', // gmail server 사용
                    port: 587,
                    secure: false,
                    auth: {
                      user: process.env.GOOGLE_MAIL, // 보내는 사람의 구글계정 메일 
                      pass: process.env.GOOGLE_PASSWORD, // 보내는 사람의 구글계정 비밀번호 (또는 생성한 앱 비밀번호)
                    },
                });
                let email = profile.email;
                let name = profile.family_name+profile.given_name;
                let splitMail = email.split('@');
                let splitdot = splitMail[1].split('.');
                
                try{
                    if (splitdot[0] == 'sookmyung'){
                        console.log('로그인했따!!!');

                        const newUser=await User.create({ 
                            email:profile.email,
                            nick:profile.family_name+profile.given_name,
                            snsID:profile.id,
                            provider:'google',
                        });
                        done(null,newUser);

                        // let generateRandom = function (min, max) {
                        //     var ranNum = Math.floor(Math.random()*(max-min+1)) + min;
                        //     return ranNum;
                        // }
                        // const number = generateRandom(111111,999999);

                        // 보낼 메세지
                        // let message = {
                        //     from: process.env.GOOGLE_MAIL, // 보내는 사람
                        //     to: `${name}<${profile.email}>`, // 받는 사람 이름과 이메일 주소
                        //     subject: '[노드친구들] 이메일 인증 관련 메일', // 메일 제목
                        //     html: `${name}님 이메일 인증 <br> 인증번호: ${number}`,
                        // };
                        
                        // // 메일이 보내진 후의 콜백 함수
                        // transporter.sendMail(message, async(err) => {
                        //     if (err) next(err);
                        //     else {
                        //         const newUser=await User.create({ 
                        //             email:profile.email,
                        //             nick:profile.family_name+profile.given_name,
                        //             snsID:profile.id,
                        //             provider:'google',
                        //         });
                        //         done(null,newUser);
                        //     }
                        //     //res.status(200).json({ isMailSucssessed: true});
                        // });
                    } else {
                        done(null,null);
                    }
                } catch (error){
                    console.error(error);
                    done(error);
                }
            }
        }catch(error){
            console.error(error);
            done(error);
        }
    }));
};
