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
    },async(acessToken,refreshToken,profile,done)=>{ 
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
                    } 
                } catch (error){
                    console.log('오류!!');
                    console.error(error);
                    done(error);
                }
                
                
                // 보낼 메세지
                let message = {
                  from: process.env.GOOGLE_MAIL, // 보내는 사람
                  to: `${profile.name}<${profile.email}>`, // 받는 사람 이름과 이메일 주소
                  subject: 'title', // 메일 제목
                  html: `<div 
                  style='
                  text-align: center; 
                  width: 50%; 
                  height: 60%;
                  margin: 15%;
                  padding: 20px;
                  box-shadow: 1px 1px 3px 0px #999;
                  '>
                  <h2>${name} 님, 안녕하세요.</h2> <br/> <br/> hello <br/><br/><br/><br/></div>`,
                };
                
                // 메일이 보내진 후의 콜백 함수
                transporter.sendMail(message, async(err) => {
                    if (err) next(err);
                    else {
                        const newUser=await User.create({ 
                            email:profile.email,
                            nick:profile.family_name+profile.given_name,
                            snsID:profile.id,
                            provider:'google',
                        });
                        done(null,newUser);
                    }
                    //res.status(200).json({ isMailSucssessed: true});
                });

                // const newUser=await User.create({ 
                //     email:profile.email,
                //     nick:profile.family_name+profile.given_name,
                //     snsID:profile.id,
                //     provider:'google',
                //   });
                //   done(null,newUser);

                // const newUser=await User.create({ 
                //     email:profile.email,
                //     nick:profile.family_name+profile.given_name,
                //     snsID:profile.id,
                //     provider:'google',
                // });
                // done(null,newUser);
            }
        }catch(error){
            console.error(error);
            done(error);
        }
    }));
};