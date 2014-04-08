!function t(i,s,n){function r(h,o){if(!s[h]){if(!i[h]){var a="function"==typeof require&&require;if(!o&&a)return a(h,!0);if(e)return e(h,!0);throw new Error("Cannot find module '"+h+"'")}var u=s[h]={exports:{}};i[h][0].call(u.exports,function(t){var s=i[h][1][t];return r(s?s:t)},u,u.exports,t,i,s,n)}return s[h].exports}for(var e="function"==typeof require&&require,h=0;h<n.length;h++)r(n[h]);return r}({1:[function(t,i){i.exports.lerp=function(t,i,s){return t*(1-s)+i*s},i.exports.smoothstep=function(t,i,s){return s=Math.max(0,Math.min(1,(s-t)/(i-t))),s*s*(3-2*s)}},{}],2:[function(t,i){function s(t){return!!t.get&&"function"==typeof t.get||!!t.set&&"function"==typeof t.set}function n(t,i,n){var r=n?t[i]:Object.getOwnPropertyDescriptor(t,i);return!n&&r.value&&"object"==typeof r.value&&(r=r.value),r&&s(r)?("undefined"==typeof r.enumerable&&(r.enumerable=!0),"undefined"==typeof r.configurable&&(r.configurable=!0),r):!1}function r(t,i){var s=Object.getOwnPropertyDescriptor(t,i);return s?(s.value&&"object"==typeof s.value&&(s=s.value),s.configurable===!1?!0:!1):!1}function e(t,i,s,e){for(var h in i)if(i.hasOwnProperty(h)){var a=n(i,h,s);if(a!==!1){var u=e||t;if(r(u.prototype,h)){if(o.ignoreFinals)continue;throw new Error("cannot override final property '"+h+"', set Class.ignoreFinals = true to skip")}Object.defineProperty(t.prototype,h,a)}else t.prototype[h]=i[h]}}function h(t,i){if(i){Array.isArray(i)||(i=[i]);for(var s=0;s<i.length;s++)e(t,i[s].prototype||i[s])}}function o(t){t||(t={});var i,s;if(t.initialize){if("function"!=typeof t.initialize)throw new Error("initialize must be a function");i=t.initialize,delete t.initialize}else if(t.Extends){var n=t.Extends;i=function(){n.apply(this,arguments)}}else i=function(){};t.Extends?(i.prototype=Object.create(t.Extends.prototype),i.prototype.constructor=i,s=t.Extends,delete t.Extends):i.prototype.constructor=i;var r=null;return t.Mixins&&(r=t.Mixins,delete t.Mixins),h(i,r),e(i,t,!0,s),i}o.extend=e,o.mixin=h,o.ignoreFinals=!1,i.exports=o},{}],3:[function(t,i,s){!function(){function t(t){t||(t=Math.random),this.p=new Uint8Array(256),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var i=0;256>i;i++)this.p[i]=256*t();for(i=0;512>i;i++)this.perm[i]=this.p[255&i],this.permMod12[i]=this.perm[i]%12}var n=.5*(Math.sqrt(3)-1),r=(3-Math.sqrt(3))/6,e=1/3,h=1/6,o=(Math.sqrt(5)-1)/4,a=(5-Math.sqrt(5))/20;t.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(t,i){var s,e,h,o,a,u=this.permMod12,c=this.perm,l=this.grad3,f=(t+i)*n,y=Math.floor(t+f),d=Math.floor(i+f),v=(y+d)*r,x=y-v,p=d-v,z=t-x,m=i-p;z>m?(o=1,a=0):(o=0,a=1);var w=z-o+r,M=m-a+r,g=z-1+2*r,b=m-1+2*r,q=255&y,S=255&d,A=.5-z*z-m*m;if(0>A)s=0;else{var k=3*u[q+c[S]];A*=A,s=A*A*(l[k]*z+l[k+1]*m)}var F=.5-w*w-M*M;if(0>F)e=0;else{var j=3*u[q+o+c[S+a]];F*=F,e=F*F*(l[j]*w+l[j+1]*M)}var T=.5-g*g-b*b;if(0>T)h=0;else{var P=3*u[q+1+c[S+1]];T*=T,h=T*T*(l[P]*g+l[P+1]*b)}return 70*(s+e+h)},noise3D:function(t,i,s){var n,r,o,a,u,c,l,f,y,d,v=this.permMod12,x=this.perm,p=this.grad3,z=(t+i+s)*e,m=Math.floor(t+z),w=Math.floor(i+z),M=Math.floor(s+z),g=(m+w+M)*h,b=m-g,q=w-g,S=M-g,A=t-b,k=i-q,F=s-S;A>=k?k>=F?(u=1,c=0,l=0,f=1,y=1,d=0):A>=F?(u=1,c=0,l=0,f=1,y=0,d=1):(u=0,c=0,l=1,f=1,y=0,d=1):F>k?(u=0,c=0,l=1,f=0,y=1,d=1):F>A?(u=0,c=1,l=0,f=0,y=1,d=1):(u=0,c=1,l=0,f=1,y=1,d=0);var j=A-u+h,T=k-c+h,P=F-l+h,V=A-f+2*h,_=k-y+2*h,I=F-d+2*h,O=A-1+3*h,C=k-1+3*h,D=F-1+3*h,E=255&m,Q=255&w,N=255&M,L=.6-A*A-k*k-F*F;if(0>L)n=0;else{var U=3*v[E+x[Q+x[N]]];L*=L,n=L*L*(p[U]*A+p[U+1]*k+p[U+2]*F)}var R=.6-j*j-T*T-P*P;if(0>R)r=0;else{var W=3*v[E+u+x[Q+c+x[N+l]]];R*=R,r=R*R*(p[W]*j+p[W+1]*T+p[W+2]*P)}var X=.6-V*V-_*_-I*I;if(0>X)o=0;else{var Y=3*v[E+f+x[Q+y+x[N+d]]];X*=X,o=X*X*(p[Y]*V+p[Y+1]*_+p[Y+2]*I)}var Z=.6-O*O-C*C-D*D;if(0>Z)a=0;else{var G=3*v[E+1+x[Q+1+x[N+1]]];Z*=Z,a=Z*Z*(p[G]*O+p[G+1]*C+p[G+2]*D)}return 32*(n+r+o+a)},noise4D:function(t,i,s,n){var r,e,h,u,c,l=(this.permMod12,this.perm),f=this.grad4,y=(t+i+s+n)*o,d=Math.floor(t+y),v=Math.floor(i+y),x=Math.floor(s+y),p=Math.floor(n+y),z=(d+v+x+p)*a,m=d-z,w=v-z,M=x-z,g=p-z,b=t-m,q=i-w,S=s-M,A=n-g,k=0,F=0,j=0,T=0;b>q?k++:F++,b>S?k++:j++,b>A?k++:T++,q>S?F++:j++,q>A?F++:T++,S>A?j++:T++;var P,V,_,I,O,C,D,E,Q,N,L,U;P=k>=3?1:0,V=F>=3?1:0,_=j>=3?1:0,I=T>=3?1:0,O=k>=2?1:0,C=F>=2?1:0,D=j>=2?1:0,E=T>=2?1:0,Q=k>=1?1:0,N=F>=1?1:0,L=j>=1?1:0,U=T>=1?1:0;var R=b-P+a,W=q-V+a,X=S-_+a,Y=A-I+a,Z=b-O+2*a,G=q-C+2*a,$=S-D+2*a,B=A-E+2*a,H=b-Q+3*a,J=q-N+3*a,K=S-L+3*a,ti=A-U+3*a,ii=b-1+4*a,si=q-1+4*a,ni=S-1+4*a,ri=A-1+4*a,ei=255&d,hi=255&v,oi=255&x,ai=255&p,ui=.6-b*b-q*q-S*S-A*A;if(0>ui)r=0;else{var ci=l[ei+l[hi+l[oi+l[ai]]]]%32*4;ui*=ui,r=ui*ui*(f[ci]*b+f[ci+1]*q+f[ci+2]*S+f[ci+3]*A)}var li=.6-R*R-W*W-X*X-Y*Y;if(0>li)e=0;else{var fi=l[ei+P+l[hi+V+l[oi+_+l[ai+I]]]]%32*4;li*=li,e=li*li*(f[fi]*R+f[fi+1]*W+f[fi+2]*X+f[fi+3]*Y)}var yi=.6-Z*Z-G*G-$*$-B*B;if(0>yi)h=0;else{var di=l[ei+O+l[hi+C+l[oi+D+l[ai+E]]]]%32*4;yi*=yi,h=yi*yi*(f[di]*Z+f[di+1]*G+f[di+2]*$+f[di+3]*B)}var vi=.6-H*H-J*J-K*K-ti*ti;if(0>vi)u=0;else{var xi=l[ei+Q+l[hi+N+l[oi+L+l[ai+U]]]]%32*4;vi*=vi,u=vi*vi*(f[xi]*H+f[xi+1]*J+f[xi+2]*K+f[xi+3]*ti)}var pi=.6-ii*ii-si*si-ni*ni-ri*ri;if(0>pi)c=0;else{var zi=l[ei+1+l[hi+1+l[oi+1+l[ai+1]]]]%32*4;pi*=pi,c=pi*pi*(f[zi]*ii+f[zi+1]*si+f[zi+2]*ni+f[zi+3]*ri)}return 27*(r+e+h+u+c)}},"undefined"!=typeof define&&define.amd?define(function(){return t}):"undefined"!=typeof window&&(window.SimplexNoise=t),"undefined"!=typeof s&&(s.SimplexNoise=t),"undefined"!=typeof i&&(i.exports=t)}()},{}],4:[function(t,i){function s(t){this.val=new n(9),t?this.copy(t):this.idt()}var n="undefined"!=typeof Float32Array?Float32Array:Array,r=s.prototype;r.clone=function(){return new s(this)},r.set=function(t){return this.copy(t)},r.copy=function(t){var i=this.val,s=t.val;return i[0]=s[0],i[1]=s[1],i[2]=s[2],i[3]=s[3],i[4]=s[4],i[5]=s[5],i[6]=s[6],i[7]=s[7],i[8]=s[8],this},r.fromMat4=function(t){var i=t.val,s=this.val;return s[0]=i[0],s[1]=i[1],s[2]=i[2],s[3]=i[4],s[4]=i[5],s[5]=i[6],s[6]=i[8],s[7]=i[9],s[8]=i[10],this},r.fromArray=function(t){var i=this.val;return i[0]=t[0],i[1]=t[1],i[2]=t[2],i[3]=t[3],i[4]=t[4],i[5]=t[5],i[6]=t[6],i[7]=t[7],i[8]=t[8],this},r.identity=function(){var t=this.val;return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,this},r.transpose=function(){var t=this.val,i=t[1],s=t[2],n=t[5];return t[1]=t[3],t[2]=t[6],t[3]=i,t[5]=t[7],t[6]=s,t[7]=n,this},r.invert=function(){var t=this.val,i=t[0],s=t[1],n=t[2],r=t[3],e=t[4],h=t[5],o=t[6],a=t[7],u=t[8],c=u*e-h*a,l=-u*r+h*o,f=a*r-e*o,y=i*c+s*l+n*f;return y?(y=1/y,t[0]=c*y,t[1]=(-u*s+n*a)*y,t[2]=(h*s-n*e)*y,t[3]=l*y,t[4]=(u*i-n*o)*y,t[5]=(-h*i+n*r)*y,t[6]=f*y,t[7]=(-a*i+s*o)*y,t[8]=(e*i-s*r)*y,this):null},r.adjoint=function(){var t=this.val,i=t[0],s=t[1],n=t[2],r=t[3],e=t[4],h=t[5],o=t[6],a=t[7],u=t[8];return t[0]=e*u-h*a,t[1]=n*a-s*u,t[2]=s*h-n*e,t[3]=h*o-r*u,t[4]=i*u-n*o,t[5]=n*r-i*h,t[6]=r*a-e*o,t[7]=s*o-i*a,t[8]=i*e-s*r,this},r.determinant=function(){var t=this.val,i=t[0],s=t[1],n=t[2],r=t[3],e=t[4],h=t[5],o=t[6],a=t[7],u=t[8];return i*(u*e-h*a)+s*(-u*r+h*o)+n*(a*r-e*o)},r.multiply=function(t){var i=this.val,s=t.val,n=i[0],r=i[1],e=i[2],h=i[3],o=i[4],a=i[5],u=i[6],c=i[7],l=i[8],f=s[0],y=s[1],d=s[2],v=s[3],x=s[4],p=s[5],z=s[6],m=s[7],w=s[8];return i[0]=f*n+y*h+d*u,i[1]=f*r+y*o+d*c,i[2]=f*e+y*a+d*l,i[3]=v*n+x*h+p*u,i[4]=v*r+x*o+p*c,i[5]=v*e+x*a+p*l,i[6]=z*n+m*h+w*u,i[7]=z*r+m*o+w*c,i[8]=z*e+m*a+w*l,this},r.translate=function(t){var i=this.val,s=t.x,n=t.y;return i[6]=s*i[0]+n*i[3]+i[6],i[7]=s*i[1]+n*i[4]+i[7],i[8]=s*i[2]+n*i[5]+i[8],this},r.rotate=function(t){var i=this.val,s=i[0],n=i[1],r=i[2],e=i[3],h=i[4],o=i[5],a=Math.sin(t),u=Math.cos(t);return i[0]=u*s+a*e,i[1]=u*n+a*h,i[2]=u*r+a*o,i[3]=u*e-a*s,i[4]=u*h-a*n,i[5]=u*o-a*r,this},r.scale=function(t){var i=this.val,s=t.x,n=t.y;return i[0]=s*i[0],i[1]=s*i[1],i[2]=s*i[2],i[3]=n*i[3],i[4]=n*i[4],i[5]=n*i[5],this},r.fromQuat=function(t){var i=t.x,s=t.y,n=t.z,r=t.w,e=i+i,h=s+s,o=n+n,a=i*e,u=i*h,c=i*o,l=s*h,f=s*o,y=n*o,d=r*e,v=r*h,x=r*o,p=this.val;return p[0]=1-(l+y),p[3]=u+x,p[6]=c-v,p[1]=u-x,p[4]=1-(a+y),p[7]=f+d,p[2]=c+v,p[5]=f-d,p[8]=1-(a+l),this},r.normalFromMat4=function(t){var i=t.val,s=this.val,n=i[0],r=i[1],e=i[2],h=i[3],o=i[4],a=i[5],u=i[6],c=i[7],l=i[8],f=i[9],y=i[10],d=i[11],v=i[12],x=i[13],p=i[14],z=i[15],m=n*a-r*o,w=n*u-e*o,M=n*c-h*o,g=r*u-e*a,b=r*c-h*a,q=e*c-h*u,S=l*x-f*v,A=l*p-y*v,k=l*z-d*v,F=f*p-y*x,j=f*z-d*x,T=y*z-d*p,P=m*T-w*j+M*F+g*k-b*A+q*S;return P?(P=1/P,s[0]=(a*T-u*j+c*F)*P,s[1]=(u*k-o*T-c*A)*P,s[2]=(o*j-a*k+c*S)*P,s[3]=(e*j-r*T-h*F)*P,s[4]=(n*T-e*k+h*A)*P,s[5]=(r*k-n*j-h*S)*P,s[6]=(x*q-p*b+z*g)*P,s[7]=(p*M-v*q-z*w)*P,s[8]=(v*b-x*M+z*m)*P,this):null},r.mul=r.multiply,r.idt=r.identity,r.reset=r.idt,r.toString=function(){var t=this.val;return"Matrix3("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+")"},r.str=r.toString,i.exports=s},{}],5:[function(t,i){function s(t){this.val=new n(16),t?this.copy(t):this.idt()}var n="undefined"!=typeof Float32Array?Float32Array:Array,r=1e-6,e=s.prototype;e.clone=function(){return new s(this)},e.set=function(t){return this.copy(t)},e.copy=function(t){var i=this.val,s=t.val;return i[0]=s[0],i[1]=s[1],i[2]=s[2],i[3]=s[3],i[4]=s[4],i[5]=s[5],i[6]=s[6],i[7]=s[7],i[8]=s[8],i[9]=s[9],i[10]=s[10],i[11]=s[11],i[12]=s[12],i[13]=s[13],i[14]=s[14],i[15]=s[15],this},e.fromArray=function(t){var i=this.val;return i[0]=t[0],i[1]=t[1],i[2]=t[2],i[3]=t[3],i[4]=t[4],i[5]=t[5],i[6]=t[6],i[7]=t[7],i[8]=t[8],i[9]=t[9],i[10]=t[10],i[11]=t[11],i[12]=t[12],i[13]=t[13],i[14]=t[14],i[15]=t[15],this},e.identity=function(){var t=this.val;return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this},e.transpose=function(){var t=this.val,i=t[1],s=t[2],n=t[3],r=t[6],e=t[7],h=t[11];return t[1]=t[4],t[2]=t[8],t[3]=t[12],t[4]=i,t[6]=t[9],t[7]=t[13],t[8]=s,t[9]=r,t[11]=t[14],t[12]=n,t[13]=e,t[14]=h,this},e.invert=function(){var t=this.val,i=t[0],s=t[1],n=t[2],r=t[3],e=t[4],h=t[5],o=t[6],a=t[7],u=t[8],c=t[9],l=t[10],f=t[11],y=t[12],d=t[13],v=t[14],x=t[15],p=i*h-s*e,z=i*o-n*e,m=i*a-r*e,w=s*o-n*h,M=s*a-r*h,g=n*a-r*o,b=u*d-c*y,q=u*v-l*y,S=u*x-f*y,A=c*v-l*d,k=c*x-f*d,F=l*x-f*v,j=p*F-z*k+m*A+w*S-M*q+g*b;return j?(j=1/j,t[0]=(h*F-o*k+a*A)*j,t[1]=(n*k-s*F-r*A)*j,t[2]=(d*g-v*M+x*w)*j,t[3]=(l*M-c*g-f*w)*j,t[4]=(o*S-e*F-a*q)*j,t[5]=(i*F-n*S+r*q)*j,t[6]=(v*m-y*g-x*z)*j,t[7]=(u*g-l*m+f*z)*j,t[8]=(e*k-h*S+a*b)*j,t[9]=(s*S-i*k-r*b)*j,t[10]=(y*M-d*m+x*p)*j,t[11]=(c*m-u*M-f*p)*j,t[12]=(h*q-e*A-o*b)*j,t[13]=(i*A-s*q+n*b)*j,t[14]=(d*z-y*w-v*p)*j,t[15]=(u*w-c*z+l*p)*j,this):null},e.adjoint=function(){var t=this.val,i=t[0],s=t[1],n=t[2],r=t[3],e=t[4],h=t[5],o=t[6],a=t[7],u=t[8],c=t[9],l=t[10],f=t[11],y=t[12],d=t[13],v=t[14],x=t[15];return t[0]=h*(l*x-f*v)-c*(o*x-a*v)+d*(o*f-a*l),t[1]=-(s*(l*x-f*v)-c*(n*x-r*v)+d*(n*f-r*l)),t[2]=s*(o*x-a*v)-h*(n*x-r*v)+d*(n*a-r*o),t[3]=-(s*(o*f-a*l)-h*(n*f-r*l)+c*(n*a-r*o)),t[4]=-(e*(l*x-f*v)-u*(o*x-a*v)+y*(o*f-a*l)),t[5]=i*(l*x-f*v)-u*(n*x-r*v)+y*(n*f-r*l),t[6]=-(i*(o*x-a*v)-e*(n*x-r*v)+y*(n*a-r*o)),t[7]=i*(o*f-a*l)-e*(n*f-r*l)+u*(n*a-r*o),t[8]=e*(c*x-f*d)-u*(h*x-a*d)+y*(h*f-a*c),t[9]=-(i*(c*x-f*d)-u*(s*x-r*d)+y*(s*f-r*c)),t[10]=i*(h*x-a*d)-e*(s*x-r*d)+y*(s*a-r*h),t[11]=-(i*(h*f-a*c)-e*(s*f-r*c)+u*(s*a-r*h)),t[12]=-(e*(c*v-l*d)-u*(h*v-o*d)+y*(h*l-o*c)),t[13]=i*(c*v-l*d)-u*(s*v-n*d)+y*(s*l-n*c),t[14]=-(i*(h*v-o*d)-e*(s*v-n*d)+y*(s*o-n*h)),t[15]=i*(h*l-o*c)-e*(s*l-n*c)+u*(s*o-n*h),this},e.determinant=function(){var t=this.val,i=t[0],s=t[1],n=t[2],r=t[3],e=t[4],h=t[5],o=t[6],a=t[7],u=t[8],c=t[9],l=t[10],f=t[11],y=t[12],d=t[13],v=t[14],x=t[15],p=i*h-s*e,z=i*o-n*e,m=i*a-r*e,w=s*o-n*h,M=s*a-r*h,g=n*a-r*o,b=u*d-c*y,q=u*v-l*y,S=u*x-f*y,A=c*v-l*d,k=c*x-f*d,F=l*x-f*v;return p*F-z*k+m*A+w*S-M*q+g*b},e.multiply=function(t){var i=this.val,s=t.val,n=i[0],r=i[1],e=i[2],h=i[3],o=i[4],a=i[5],u=i[6],c=i[7],l=i[8],f=i[9],y=i[10],d=i[11],v=i[12],x=i[13],p=i[14],z=i[15],m=s[0],w=s[1],M=s[2],g=s[3];return i[0]=m*n+w*o+M*l+g*v,i[1]=m*r+w*a+M*f+g*x,i[2]=m*e+w*u+M*y+g*p,i[3]=m*h+w*c+M*d+g*z,m=s[4],w=s[5],M=s[6],g=s[7],i[4]=m*n+w*o+M*l+g*v,i[5]=m*r+w*a+M*f+g*x,i[6]=m*e+w*u+M*y+g*p,i[7]=m*h+w*c+M*d+g*z,m=s[8],w=s[9],M=s[10],g=s[11],i[8]=m*n+w*o+M*l+g*v,i[9]=m*r+w*a+M*f+g*x,i[10]=m*e+w*u+M*y+g*p,i[11]=m*h+w*c+M*d+g*z,m=s[12],w=s[13],M=s[14],g=s[15],i[12]=m*n+w*o+M*l+g*v,i[13]=m*r+w*a+M*f+g*x,i[14]=m*e+w*u+M*y+g*p,i[15]=m*h+w*c+M*d+g*z,this},e.translate=function(t){var i=t.x,s=t.y,n=t.z,r=this.val;return r[12]=r[0]*i+r[4]*s+r[8]*n+r[12],r[13]=r[1]*i+r[5]*s+r[9]*n+r[13],r[14]=r[2]*i+r[6]*s+r[10]*n+r[14],r[15]=r[3]*i+r[7]*s+r[11]*n+r[15],this},e.scale=function(t){var i=t.x,s=t.y,n=t.z,r=this.val;return r[0]=r[0]*i,r[1]=r[1]*i,r[2]=r[2]*i,r[3]=r[3]*i,r[4]=r[4]*s,r[5]=r[5]*s,r[6]=r[6]*s,r[7]=r[7]*s,r[8]=r[8]*n,r[9]=r[9]*n,r[10]=r[10]*n,r[11]=r[11]*n,r[12]=r[12],r[13]=r[13],r[14]=r[14],r[15]=r[15],this},e.rotate=function(t,i){var s,n,e,h,o,a,u,c,l,f,y,d,v,x,p,z,m,w,M,g,b,q,S,A,k=this.val,F=i.x,j=i.y,T=i.z,P=Math.sqrt(F*F+j*j+T*T);return Math.abs(P)<r?null:(P=1/P,F*=P,j*=P,T*=P,s=Math.sin(t),n=Math.cos(t),e=1-n,h=k[0],o=k[1],a=k[2],u=k[3],c=k[4],l=k[5],f=k[6],y=k[7],d=k[8],v=k[9],x=k[10],p=k[11],z=F*F*e+n,m=j*F*e+T*s,w=T*F*e-j*s,M=F*j*e-T*s,g=j*j*e+n,b=T*j*e+F*s,q=F*T*e+j*s,S=j*T*e-F*s,A=T*T*e+n,k[0]=h*z+c*m+d*w,k[1]=o*z+l*m+v*w,k[2]=a*z+f*m+x*w,k[3]=u*z+y*m+p*w,k[4]=h*M+c*g+d*b,k[5]=o*M+l*g+v*b,k[6]=a*M+f*g+x*b,k[7]=u*M+y*g+p*b,k[8]=h*q+c*S+d*A,k[9]=o*q+l*S+v*A,k[10]=a*q+f*S+x*A,k[11]=u*q+y*S+p*A,this)},e.rotateX=function(t){var i=this.val,s=Math.sin(t),n=Math.cos(t),r=i[4],e=i[5],h=i[6],o=i[7],a=i[8],u=i[9],c=i[10],l=i[11];return i[4]=r*n+a*s,i[5]=e*n+u*s,i[6]=h*n+c*s,i[7]=o*n+l*s,i[8]=a*n-r*s,i[9]=u*n-e*s,i[10]=c*n-h*s,i[11]=l*n-o*s,this},e.rotateY=function(t){var i=this.val,s=Math.sin(t),n=Math.cos(t),r=i[0],e=i[1],h=i[2],o=i[3],a=i[8],u=i[9],c=i[10],l=i[11];return i[0]=r*n-a*s,i[1]=e*n-u*s,i[2]=h*n-c*s,i[3]=o*n-l*s,i[8]=r*s+a*n,i[9]=e*s+u*n,i[10]=h*s+c*n,i[11]=o*s+l*n,this},e.rotateZ=function(t){var i=this.val,s=Math.sin(t),n=Math.cos(t),r=i[0],e=i[1],h=i[2],o=i[3],a=i[4],u=i[5],c=i[6],l=i[7];return i[0]=r*n+a*s,i[1]=e*n+u*s,i[2]=h*n+c*s,i[3]=o*n+l*s,i[4]=a*n-r*s,i[5]=u*n-e*s,i[6]=c*n-h*s,i[7]=l*n-o*s,this},e.fromRotationTranslation=function(t,i){var s=this.val,n=t.x,r=t.y,e=t.z,h=t.w,o=n+n,a=r+r,u=e+e,c=n*o,l=n*a,f=n*u,y=r*a,d=r*u,v=e*u,x=h*o,p=h*a,z=h*u;return s[0]=1-(y+v),s[1]=l+z,s[2]=f-p,s[3]=0,s[4]=l-z,s[5]=1-(c+v),s[6]=d+x,s[7]=0,s[8]=f+p,s[9]=d-x,s[10]=1-(c+y),s[11]=0,s[12]=i.x,s[13]=i.y,s[14]=i.z,s[15]=1,this},e.fromQuat=function(t){var i=this.val,s=t.x,n=t.y,r=t.z,e=t.w,h=s+s,o=n+n,a=r+r,u=s*h,c=s*o,l=s*a,f=n*o,y=n*a,d=r*a,v=e*h,x=e*o,p=e*a;return i[0]=1-(f+d),i[1]=c+p,i[2]=l-x,i[3]=0,i[4]=c-p,i[5]=1-(u+d),i[6]=y+v,i[7]=0,i[8]=l+x,i[9]=y-v,i[10]=1-(u+f),i[11]=0,i[12]=0,i[13]=0,i[14]=0,i[15]=1,this},e.frustum=function(t,i,s,n,r,e){var h=this.val,o=1/(i-t),a=1/(n-s),u=1/(r-e);return h[0]=2*r*o,h[1]=0,h[2]=0,h[3]=0,h[4]=0,h[5]=2*r*a,h[6]=0,h[7]=0,h[8]=(i+t)*o,h[9]=(n+s)*a,h[10]=(e+r)*u,h[11]=-1,h[12]=0,h[13]=0,h[14]=e*r*2*u,h[15]=0,this},e.perspective=function(t,i,s,n){var r=this.val,e=1/Math.tan(t/2),h=1/(s-n);return r[0]=e/i,r[1]=0,r[2]=0,r[3]=0,r[4]=0,r[5]=e,r[6]=0,r[7]=0,r[8]=0,r[9]=0,r[10]=(n+s)*h,r[11]=-1,r[12]=0,r[13]=0,r[14]=2*n*s*h,r[15]=0,this},e.ortho=function(t,i,s,n,r,e){var h=this.val,o=1/(t-i),a=1/(s-n),u=1/(r-e);return h[0]=-2*o,h[1]=0,h[2]=0,h[3]=0,h[4]=0,h[5]=-2*a,h[6]=0,h[7]=0,h[8]=0,h[9]=0,h[10]=2*u,h[11]=0,h[12]=(t+i)*o,h[13]=(n+s)*a,h[14]=(e+r)*u,h[15]=1,this},e.lookAt=function(t,i,s){var n,e,h,o,a,u,c,l,f,y,d=this.val,v=t.x,x=t.y,p=t.z,z=s.x,m=s.y,w=s.z,M=i.x,g=i.y,b=i.z;return Math.abs(v-M)<r&&Math.abs(x-g)<r&&Math.abs(p-b)<r?this.identity():(c=v-M,l=x-g,f=p-b,y=1/Math.sqrt(c*c+l*l+f*f),c*=y,l*=y,f*=y,n=m*f-w*l,e=w*c-z*f,h=z*l-m*c,y=Math.sqrt(n*n+e*e+h*h),y?(y=1/y,n*=y,e*=y,h*=y):(n=0,e=0,h=0),o=l*h-f*e,a=f*n-c*h,u=c*e-l*n,y=Math.sqrt(o*o+a*a+u*u),y?(y=1/y,o*=y,a*=y,u*=y):(o=0,a=0,u=0),d[0]=n,d[1]=o,d[2]=c,d[3]=0,d[4]=e,d[5]=a,d[6]=l,d[7]=0,d[8]=h,d[9]=u,d[10]=f,d[11]=0,d[12]=-(n*v+e*x+h*p),d[13]=-(o*v+a*x+u*p),d[14]=-(c*v+l*x+f*p),d[15]=1,this)},e.mul=e.multiply,e.idt=e.identity,e.reset=e.idt,e.toString=function(){var t=this.val;return"Matrix4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+", "+t[9]+", "+t[10]+", "+t[11]+", "+t[12]+", "+t[13]+", "+t[14]+", "+t[15]+")"},e.str=e.toString,i.exports=s},{}],6:[function(t,i){function s(t,i,s,n){"object"==typeof t?(this.x=t.x||0,this.y=t.y||0,this.z=t.z||0,this.w=t.w||0):(this.x=t||0,this.y=i||0,this.z=s||0,this.w=n||0)}var n=t("./Vector3"),r=t("./Matrix3"),e=t("./common"),h="undefined"!=typeof Int8Array?new Int8Array([1,2,0]):[1,2,0],o="undefined"!=typeof Float32Array?new Float32Array([0,0,0]):[0,0,0],a=new n(1,0,0),u=new n(0,1,0),c=new n,l=new r,f=s.prototype;for(var y in e)f[y]=e[y];f.rotationTo=function(t,i){var s=t.x*i.x+t.y*i.y+t.z*i.z;return-.999999>s?(c.copy(a).cross(t).len()<1e-6&&c.copy(u).cross(t),c.normalize(),this.setAxisAngle(c,Math.PI)):s>.999999?(this.x=0,this.y=0,this.z=0,this.w=1,this):(c.copy(t).cross(i),this.x=c.x,this.y=c.y,this.z=c.z,this.w=1+s,this.normalize())},f.setAxes=function(t,i,s){var n=l.val;return n[0]=i.x,n[3]=i.y,n[6]=i.z,n[1]=s.x,n[4]=s.y,n[7]=s.z,n[2]=-t.x,n[5]=-t.y,n[8]=-t.z,this.fromMat3(l).normalize()},f.identity=function(){return this.x=this.y=this.z=0,this.w=1,this},f.setAxisAngle=function(t,i){i=.5*i;var s=Math.sin(i);return this.x=s*t.x,this.y=s*t.y,this.z=s*t.z,this.w=Math.cos(i),this},f.multiply=function(t){var i=this.x,s=this.y,n=this.z,r=this.w,e=t.x,h=t.y,o=t.z,a=t.w;return this.x=i*a+r*e+s*o-n*h,this.y=s*a+r*h+n*e-i*o,this.z=n*a+r*o+i*h-s*e,this.w=r*a-i*e-s*h-n*o,this},f.slerp=function(t,i){var s,n,r,e,h,o=this.x,a=this.y,u=this.y,c=this.y,l=t.x,f=t.y,y=t.z,d=t.w;return n=o*l+a*f+u*y+c*d,0>n&&(n=-n,l=-l,f=-f,y=-y,d=-d),1-n>1e-6?(s=Math.acos(n),r=Math.sin(s),e=Math.sin((1-i)*s)/r,h=Math.sin(i*s)/r):(e=1-i,h=i),this.x=e*o+h*l,this.y=e*a+h*f,this.z=e*u+h*y,this.w=e*c+h*d,this},f.invert=function(){var t=this.x,i=this.y,s=this.z,n=this.w,r=t*t+i*i+s*s+n*n,e=r?1/r:0;return this.x=-t*e,this.y=-i*e,this.z=-s*e,this.w=n*e,this},f.conjugate=function(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this},f.rotateX=function(t){t*=.5;var i=this.x,s=this.y,n=this.z,r=this.w,e=Math.sin(t),h=Math.cos(t);return this.x=i*h+r*e,this.y=s*h+n*e,this.z=n*h-s*e,this.w=r*h-i*e,this},f.rotateY=function(t){t*=.5;var i=this.x,s=this.y,n=this.z,r=this.w,e=Math.sin(t),h=Math.cos(t);return this.x=i*h-n*e,this.y=s*h+r*e,this.z=n*h+i*e,this.w=r*h-s*e,this},f.rotateZ=function(t){t*=.5;var i=this.x,s=this.y,n=this.z,r=this.w,e=Math.sin(t),h=Math.cos(t);return this.x=i*h+s*e,this.y=s*h-i*e,this.z=n*h+r*e,this.w=r*h-n*e,this},f.calculateW=function(){var t=this.x,i=this.y,s=this.z;return this.x=t,this.y=i,this.z=s,this.w=-Math.sqrt(Math.abs(1-t*t-i*i-s*s)),this},f.fromMat3=function(t){var i,s=t.val,n=s[0]+s[4]+s[8];if(n>0)i=Math.sqrt(n+1),this.w=.5*i,i=.5/i,this.x=(s[7]-s[5])*i,this.y=(s[2]-s[6])*i,this.z=(s[3]-s[1])*i;else{var r=0;s[4]>s[0]&&(r=1),s[8]>s[3*r+r]&&(r=2);var e=h[r],a=h[e];i=Math.sqrt(s[3*r+r]-s[3*e+e]-s[3*a+a]+1),o[r]=.5*i,i=.5/i,o[e]=(s[3*e+r]+s[3*r+e])*i,o[a]=(s[3*a+r]+s[3*r+a])*i,this.x=o[0],this.y=o[1],this.z=o[2],this.w=(s[3*a+e]-s[3*e+a])*i}return this},f.idt=f.identity,f.sub=f.subtract,f.mul=f.multiply,f.len=f.length,f.lenSq=f.lengthSq,f.reset=f.idt,f.toString=function(){return"Quaternion("+this.x+", "+this.y+", "+this.z+", "+this.w+")"},f.str=f.toString,i.exports=s},{"./Matrix3":4,"./Vector3":8,"./common":10}],7:[function(t,i){function s(t,i){"object"==typeof t?(this.x=t.x||0,this.y=t.y||0):(this.x=t||0,this.y=i||0)}var n=s.prototype;n.clone=function(){return new s(this.x,this.y)},n.copy=function(t){return this.x=t.x||0,this.y=t.y||0,this},n.set=function(t,i){return"object"==typeof t?(this.x=t.x||0,this.y=t.y||0):(this.x=t||0,this.y=i||0),this},n.add=function(t){return this.x+=t.x,this.y+=t.y,this},n.subtract=function(t){return this.x-=t.x,this.y-=t.y,this},n.multiply=function(t){return this.x*=t.x,this.y*=t.y,this},n.scale=function(t){return this.x*=t,this.y*=t,this},n.divide=function(t){return this.x/=t.x,this.y/=t.y,this},n.negate=function(){return this.x=-this.x,this.y=-this.y,this},n.distance=function(t){var i=t.x-this.x,s=t.y-this.y;return Math.sqrt(i*i+s*s)},n.distanceSq=function(t){var i=t.x-this.x,s=t.y-this.y;return i*i+s*s},n.length=function(){var t=this.x,i=this.y;return Math.sqrt(t*t+i*i)},n.lengthSq=function(){var t=this.x,i=this.y;return t*t+i*i},n.normalize=function(){var t=this.x,i=this.y,s=t*t+i*i;return s>0&&(s=1/Math.sqrt(s),this.x=t*s,this.y=i*s),this},n.dot=function(t){return this.x*t.x+this.y*t.y},n.cross=function(t){return this.x*t.y-this.y*t.x},n.lerp=function(t,i){var s=this.x,n=this.y;return i=i||0,this.x=s+i*(t.x-s),this.y=n+i*(t.y-n),this},n.transformMat3=function(t){var i=this.x,s=this.y,n=t.val;return this.x=n[0]*i+n[2]*s+n[4],this.y=n[1]*i+n[3]*s+n[5],this},n.transformMat4=function(t){var i=this.x,s=this.y,n=t.val;return this.x=n[0]*i+n[4]*s+n[12],this.y=n[1]*i+n[5]*s+n[13],this},n.reset=function(){return this.x=0,this.y=0,this},n.sub=n.subtract,n.mul=n.multiply,n.div=n.divide,n.dist=n.distance,n.distSq=n.distanceSq,n.len=n.length,n.lenSq=n.lengthSq,n.toString=function(){return"Vector2("+this.x+", "+this.y+")"},n.random=function(t){t=t||1;var i=2*Math.random()*Math.PI;return this.x=Math.cos(i)*t,this.y=Math.sin(i)*t,this},n.str=n.toString,i.exports=s},{}],8:[function(t,i){function s(t,i,s){"object"==typeof t?(this.x=t.x||0,this.y=t.y||0,this.z=t.z||0):(this.x=t||0,this.y=i||0,this.z=s||0)}var n=s.prototype;n.clone=function(){return new s(this.x,this.y,this.z)},n.copy=function(t){return this.x=t.x,this.y=t.y,this.z=t.z,this},n.set=function(t,i,s){return"object"==typeof t?(this.x=t.x||0,this.y=t.y||0,this.z=t.z||0):(this.x=t||0,this.y=i||0,this.z=s||0),this},n.add=function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this},n.subtract=function(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this},n.multiply=function(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this},n.scale=function(t){return this.x*=t,this.y*=t,this.z*=t,this},n.divide=function(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this},n.negate=function(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this},n.distance=function(t){var i=t.x-this.x,s=t.y-this.y,n=t.z-this.z;return Math.sqrt(i*i+s*s+n*n)},n.distanceSq=function(t){var i=t.x-this.x,s=t.y-this.y,n=t.z-this.z;return i*i+s*s+n*n},n.length=function(){var t=this.x,i=this.y,s=this.z;return Math.sqrt(t*t+i*i+s*s)},n.lengthSq=function(){var t=this.x,i=this.y,s=this.z;return t*t+i*i+s*s},n.normalize=function(){var t=this.x,i=this.y,s=this.z,n=t*t+i*i+s*s;return n>0&&(n=1/Math.sqrt(n),this.x=t*n,this.y=i*n,this.z=s*n),this},n.dot=function(t){return this.x*t.x+this.y*t.y+this.z*t.z},n.cross=function(t){var i=this.x,s=this.y,n=this.z,r=t.x,e=t.y,h=t.z;return this.x=s*h-n*e,this.y=n*r-i*h,this.z=i*e-s*r,this},n.lerp=function(t,i){var s=this.x,n=this.y,r=this.z;return i=i||0,this.x=s+i*(t.x-s),this.y=n+i*(t.y-n),this.z=r+i*(t.z-r),this},n.transformMat4=function(t){var i=this.x,s=this.y,n=this.z,r=t.val;return this.x=r[0]*i+r[4]*s+r[8]*n+r[12],this.y=r[1]*i+r[5]*s+r[9]*n+r[13],this.z=r[2]*i+r[6]*s+r[10]*n+r[14],this},n.transformMat3=function(t){var i=this.x,s=this.y,n=this.z,r=t.val;return this.x=i*r[0]+s*r[3]+n*r[6],this.y=i*r[1]+s*r[4]+n*r[7],this.z=i*r[2]+s*r[5]+n*r[8],this},n.transformQuat=function(t){var i=this.x,s=this.y,n=this.z,r=t.x,e=t.y,h=t.z,o=t.w,a=o*i+e*n-h*s,u=o*s+h*i-r*n,c=o*n+r*s-e*i,l=-r*i-e*s-h*n;return this.x=a*o+l*-r+u*-h-c*-e,this.y=u*o+l*-e+c*-r-a*-h,this.z=c*o+l*-h+a*-e-u*-r,this},n.project=function(t){var i=this.x,s=this.y,n=this.z,r=t.val,e=r[0],h=r[1],o=r[2],a=r[3],u=r[4],c=r[5],l=r[6],f=r[7],y=r[8],d=r[9],v=r[10],x=r[11],p=r[12],z=r[13],m=r[14],w=r[15],M=1/(i*a+s*f+n*x+w);return this.x=(i*e+s*u+n*y+p)*M,this.y=(i*h+s*c+n*d+z)*M,this.z=(i*o+s*l+n*v+m)*M,this},n.unproject=function(t,i){var s=t.x,n=t.y,r=t.z,e=t.w,h=this.x,o=this.y,a=this.z;return h-=s,o=e-o-1,o-=n,this.x=2*h/r-1,this.y=2*o/e-1,this.z=2*a-1,this.project(i)},n.random=function(t){t=t||1;var i=2*Math.random()*Math.PI,s=2*Math.random()-1,n=Math.sqrt(1-s*s)*t;return this.x=Math.cos(i)*n,this.y=Math.sin(i)*n,this.z=s*t,this},n.reset=function(){return this.x=0,this.y=0,this.z=0,this},n.sub=n.subtract,n.mul=n.multiply,n.div=n.divide,n.dist=n.distance,n.distSq=n.distanceSq,n.len=n.length,n.lenSq=n.lengthSq,n.toString=function(){return"Vector3("+this.x+", "+this.y+", "+this.z+")"},n.str=n.toString,i.exports=s},{}],9:[function(t,i){function s(t,i,s,n){"object"==typeof t?(this.x=t.x||0,this.y=t.y||0,this.z=t.z||0,this.w=t.w||0):(this.x=t||0,this.y=i||0,this.z=s||0,this.w=n||0)}var n=t("./common"),r=s.prototype;for(var e in n)r[e]=n[e];r.clone=function(){return new s(this.x,this.y,this.z,this.w)},r.multiply=function(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this},r.divide=function(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this},r.distance=function(t){var i=t.x-this.x,s=t.y-this.y,n=t.z-this.z,r=t.w-this.w;return Math.sqrt(i*i+s*s+n*n+r*r)},r.distanceSq=function(t){var i=t.x-this.x,s=t.y-this.y,n=t.z-this.z,r=t.w-this.w;return i*i+s*s+n*n+r*r},r.negate=function(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this},r.transformMat4=function(t){var i=t.val,s=this.x,n=this.y,r=this.z,e=this.w;return this.x=i[0]*s+i[4]*n+i[8]*r+i[12]*e,this.y=i[1]*s+i[5]*n+i[9]*r+i[13]*e,this.z=i[2]*s+i[6]*n+i[10]*r+i[14]*e,this.w=i[3]*s+i[7]*n+i[11]*r+i[15]*e,this},r.transformQuat=function(t){var i=this.x,s=this.y,n=this.z,r=t.x,e=t.y,h=t.z,o=t.w,a=o*i+e*n-h*s,u=o*s+h*i-r*n,c=o*n+r*s-e*i,l=-r*i-e*s-h*n;return this.x=a*o+l*-r+u*-h-c*-e,this.y=u*o+l*-e+c*-r-a*-h,this.z=c*o+l*-h+a*-e-u*-r,this},r.random=function(t){return t=t||1,this.x=(2*Math.random()-1)*t,this.y=(2*Math.random()-1)*t,this.z=(2*Math.random()-1)*t,this.w=(2*Math.random()-1)*t,this},r.reset=function(){return this.x=0,this.y=0,this.z=0,this.w=0,this},r.sub=r.subtract,r.mul=r.multiply,r.div=r.divide,r.dist=r.distance,r.distSq=r.distanceSq,r.len=r.length,r.lenSq=r.lengthSq,r.toString=function(){return"Vector4("+this.x+", "+this.y+", "+this.z+", "+this.w+")"},r.str=r.toString,i.exports=s},{"./common":10}],10:[function(t,i){i.exports={copy:function(t){return this.x=t.x||0,this.y=t.y||0,this.z=t.z||0,this.w=t.w||0,this},set:function(t,i,s,n){return"object"==typeof t?(this.x=t.x||0,this.y=t.y||0,this.z=t.z||0,this.w=t.w||0):(this.x=t||0,this.y=i||0,this.z=s||0,this.w=n||0),this},add:function(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this},subtract:function(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this},scale:function(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this},length:function(){var t=this.x,i=this.y,s=this.z,n=this.w;return Math.sqrt(t*t+i*i+s*s+n*n)},lengthSq:function(){var t=this.x,i=this.y,s=this.z,n=this.w;return t*t+i*i+s*s+n*n},normalize:function(){var t=this.x,i=this.y,s=this.z,n=this.w,r=t*t+i*i+s*s+n*n;return r>0&&(r=1/Math.sqrt(r),this.x=t*r,this.y=i*r,this.z=s*r,this.w=n*r),this},dot:function(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w},lerp:function(t,i){var s=this.x,n=this.y,r=this.z,e=this.w;return i=i||0,this.x=s+i*(t.x-s),this.y=n+i*(t.y-n),this.z=r+i*(t.z-r),this.w=e+i*(t.w-e),this}}},{}],11:[function(t,i){i.exports={Vector2:t("./Vector2"),Vector3:t("./Vector3"),Vector4:t("./Vector4"),Matrix3:t("./Matrix3"),Matrix4:t("./Matrix4"),Quaternion:t("./Quaternion")}},{"./Matrix3":4,"./Matrix4":5,"./Quaternion":6,"./Vector2":7,"./Vector3":8,"./Vector4":9}],12:[function(t){var i=window.$,s=(t("simplex-noise"),t("vecmath").Vector2),n=(t("interpolation").smoothstep,t("interpolation").lerp),r=t("./util/NoiseMap"),e=t("./util/imagedata"),h=t("./impression").Particle,o=window.dat,a=new s,u=new s;i(function(){function t(){q=e.getImageData(b).data,d(),requestAnimationFrame(x)}function s(){for(var t in k.__folders.stroke.__controllers)k.__folders.stroke.__controllers[t].updateDisplay();for(var t in k.__folders.color.__controllers)k.__folders.color.__controllers[t].updateDisplay()}function c(){TweenLite.killTweensOf(S),s(),TweenLite.fromTo(S,1,{thickness:30},{thickness:20,ease:Expo.easeOut,delay:2}),TweenLite.fromTo(S,3,{length:23,alpha:.3,life:.7,speed:1},{life:.5,alpha:.2,length:70,speed:.6,delay:1,onUpdate:s.bind(this)}),TweenLite.to(S,3,{thickness:7,length:30,delay:4}),TweenLite.to(S,1,{length:10,delay:6})}function l(){F.length=0;for(var t=0;j>t;t++)F.push((new h).reset(z,m).random())}function f(){A.css("opacity",.2*S.grain)}function y(){k=new o.GUI;var t=k.addFolder("noise");t.add(S,"shift");var s=t.add(S,"scale",.1,5);s.onFinishChange(function(){g.scale=S.scale,g.generate()});var n=k.addFolder("stroke");n.add(S,"count",1,1500).onFinishChange(function(t){j=~~t,l()}),n.add(S,"length",.1,200),n.add(S,"thickness",.1,30),n.add(S,"life",0,1),n.add(S,"speed",0,1),n.add(S,"alpha",0,1),n.add(S,"angle",0,2),n.add(S,"round"),n.add(S,"motion"),n.open();var r=k.addFolder("color");r.add(S,"useOriginal"),r.add(S,"hue",0,360),r.add(S,"saturation",0,1),r.add(S,"lightness",0,1),r.add(S,"grain",0,1).onFinishChange(f.bind(this)),r.open();var e=k.addFolder("canvas");e.add(S,"painting"),e.addColor(S,"background"),e.add(S,"viewOriginal").onFinishChange(function(t){i(b).css("visibility",t?"visible":"hidden")}),e.add(S,"animate"),e.add(S,"clear"),e.open()}function d(){w.globalAlpha=1,w.fillStyle=S.background,w.fillRect(0,0,z,m)}function v(){TweenLite.killTweensOf(S),d(),l()}function x(){if(requestAnimationFrame(x),P+=.1,T++,S.painting){S.shift&&T%20===0&&(g.offset+=.01,g.generate());for(var t=b.width,i=0;i<F.length;i++){var s=F[i];s.motion&&s.position.add(s.velocity);var r=~~s.position.x,e=~~s.position.y,h=z,o=z,c=g.sample(r*(M/h),e*(M/o)),l=c*Math.PI*2*S.angle;a.set(Math.cos(l),Math.sin(l)),s.velocity.add(a),s.velocity.normalize(),(s.position.x>z||s.position.y>m||s.position.y<0)&&s.reset();var f=c/2+.5,y=(g.offset%50/50*f,4*(r+e*t)),d=q[y],v=q[y+1],p=q[y+2],A=S.hue,k=.2126*(d/255)+.7152*(v/255)+.0722*(p/255),j=k;w.strokeStyle=S.useOriginal?"rgb("+~~(d*j)+", "+~~(v*j)+", "+~~(p*j)+")":"hsl("+n(A,A-100,f)+", "+(1-k)*n(.2,.9,f)*S.saturation*100+"%, "+k*n(.45,1,f)*S.lightness*100+"%)";w.beginPath(),w.moveTo(s.position.x,s.position.y);var V=S.length*(c/2+.5)*s.size;a.copy(s.position),u.copy(s.velocity).scale(V),a.add(u),w.lineTo(a.x,a.y),w.stroke(),w.globalAlpha=S.alpha,w.lineWidth=S.thickness*(c/2+.5),w.lineCap=S.round?"round":"square",s.size+=.1*S.speed*s.speed,s.size>=S.life&&s.reset(z,m).random()}}}var p=i("<canvas>").appendTo(document.body)[0],z=900,m=535;p.width=z,p.height=m;var w=p.getContext("2d"),M=256,g=new r(M);g.scale=3.2,g.smoothing=!0,g.generate();var b=new Image;b.onload=t,b.src="img/skyline2.png";var q,S={scale:g.scale,shift:!1,painting:!0,count:500,length:33,thickness:12,speed:1,life:1,alpha:.25,round:!0,motion:!0,angle:1,useOriginal:!0,hue:70,saturation:1,lightness:1,grain:.7,background:"#2f2f2f",clear:v,animate:c,viewOriginal:!1},A=i("<div>").appendTo(document.body).addClass("noise overlay").css({width:z,height:m,opacity:.2*S.grain});i(document.body).css("background",S.background),i(b).appendTo(document.body).css({visibility:"hidden"}).addClass("overlay original");var k;y();var F=[],j=500,T=0,P=0;l(),c()})},{"./impression":14,"./util/NoiseMap":15,"./util/imagedata":16,interpolation:1,"simplex-noise":3,vecmath:11}],13:[function(t,i){function s(t,i,s,r){this.position=new n(t,i),this.velocity=new n(s,r),this.size=0,this.speed=Math.random(),this.brightness=Math.random()}var n=t("vecmath").Vector2;
s.prototype.random=function(){return this.size=Math.random(),this},s.prototype.reset=function(t,i){return t=t||0,i=i||0,this.size=0,this.brightness=Math.random(),this.velocity.set(0,0),this.position.set(Math.random()*t,Math.random()*i),this},i.exports=s},{vecmath:11}],14:[function(t,i){i.exports={Particle:t("./Particle")}},{"./Particle":13}],15:[function(t,i){var s=t("klasse"),n=t("simplex-noise"),r=(t("interpolation").lerp,t("./sampling")),e=void 0,h=new n(e),o=new s({initialize:function(t){if(!t)throw"no size specified to NoiseMap";this.size=t,this.scale=20,this.offset=0,this.smooth=!0,this.seamless=!1,this.data=new Float32Array(this.size*this.size)},seamlessNoise:function(t,i,s,n,r,e,o){var a=s/(2*Math.PI),u=2*Math.PI*t/s,c=a*Math.cos(u),l=a*Math.sin(u),f=2*Math.PI*i/s,y=a*Math.cos(f),d=a*Math.sin(f);return h.noise4D(n+c,r+l,e+y,o+d)},generate:function(){for(var t=this.data,i=this.size,s=this.offset,n=this.seamless,r=this.scale,e=0;e<t.length;e++){var o=e%i,a=~~(e/i);t[e]=n?this.seamlessNoise(o/i*r+s,a/i*r+s,r,0,0,0,0):h.noise3D(o/i*r,a/i*r,s)}},sample:function(t,i){return this.smooth?r.bilinear(this.data,this.size,t,i):r.nearest(this.data,this.size,t,i)}});i.exports=o},{"./sampling":17,interpolation:1,klasse:2,"simplex-noise":3}],16:[function(t,i){var s,n;i.exports.getImageData=function(t,i,r){s||(s=document.createElement("canvas"),n=s.getContext("2d")),i=i||0===i?i:t.width,r=r||0===r?r:t.height,s.width=i,s.height=r,n.globalAlpha=1,n.clearRect(0,0,i,r),n.drawImage(t,0,0,i,r);var e=n.getImageData(0,0,i,r);return e},i.exports.release=function(){s&&(s=null,n=null)}},{}],17:[function(t,i){var s=t("interpolation").lerp,n=t("interpolation").smoothstep;i.exports.nearest=function(t,i,s,n){var r=~~s%i,e=~~n%i;return t[r+e*i]},i.exports.bilinear=function(t,i,r,e){var h=Math.floor(r),o=Math.floor(e),a=r-h,u=e-o,c=i-1,l=h&c,f=l+1&c,y=o&c,d=y+1&c,v=t[y*i+l],x=t[y*i+f],p=t[d*i+l],z=t[d*i+f],m=n(0,1,a),w=n(0,1,u),M=s(v,x,m),g=s(p,z,m),b=s(M,g,w);return b}},{interpolation:1}]},{},[12]);