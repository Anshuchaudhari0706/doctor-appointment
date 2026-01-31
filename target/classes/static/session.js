function checkSession(){
 let u=localStorage.getItem("loginUser");
 let t=localStorage.getItem("loginTime");
 if(!u||!t){location="login.html";return;}
 let days=(Date.now()-t)/(1000*60*60*24);
 if(days>15){localStorage.clear();alert("Session expired");location="login.html";}
}
