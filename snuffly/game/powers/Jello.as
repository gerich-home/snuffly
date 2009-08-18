package snuffly.game.powers
{
	import Box2D.Dynamics.*;
	import Box2D.Common.Math.*;
	import snuffly.game.core.*;
	import flash.utils.*;
	import flash.display.Shape;
	import flash.display.Bitmap; 
	import flash.display.BitmapData;
	import flash.display.Graphics;
	import flash.display.GradientType;
	import flash.geom.Rectangle;
	import flash.geom.Point;
	import flash.geom.Matrix;
	import flash.events.Event;
	import flash.events.EventDispatcher;
	import flash.events.KeyboardEvent;
	//Желе
	public class Jello implements IDrawable, IPower, IParticleGroup
	{
		protected var pt:Vector.<b2Body>;						//Частицы желе
		protected var ptCount:int;								//Количество частиц
		
		protected var ij:Vector.<Vector.<int>>;					//Просмотрена ли пара соседей ij(0-не просмотрена)?
		protected var spring_ij:Vector.<Vector.<Spring>>;		//Свзяь между частицами i и j(null, если её нет)
		protected var ns:Vector.<Vector.<int>>;					//Индексы соседей частицы
		protected var nsq1:Vector.<Vector.<Number>>;			//q1
		protected var nsq2:Vector.<Vector.<Number>>;			//q2      - для SPH модели
		protected var nsdx:Vector.<Vector.<Number>>;			//вектор между точками частицами i и j
		protected var nsdy:Vector.<Vector.<Number>>;
		protected var ro:Vector.<Number>;						//Дальняя плотность
		protected var ro_near:Vector.<Number>;					//Ближняя плотность
		protected var press:Vector.<Number>;					//Дальнее давление
		protected var press_near:Vector.<Number>;				//Ближнее давление
		protected var powerx:Vector.<Number>;					//Силы от связей и давления
		protected var powery:Vector.<Number>;
		protected var pt_springs:Vector.<int>;					//Число связей у частицы
		protected var groupqueue:Vector.<int>;					//Очередь для выделения компоненты связности
		protected var px:Vector.<Number>;						//Координата x
		protected var py:Vector.<Number>;						//Координата y
		protected var vx:Vector.<Number>;						//Скорость x
		protected var vy:Vector.<Number>;						//Скорость y
		
		protected var spring_list:Spring;						//Связый список активных связей
		protected var spring_pool:Spring;						//Пул связей
		
		
		protected var jelloState:Boolean;						//Состояние желе
		protected var frozen:Boolean;							//Можно ли менять длину связей и добавлять новые?
		
		protected var _spacing:Number;		//Псевдорадиус
		protected var imageRadius:Number;	//Радиус изображения
		protected var k:Number;				//Сила дальнего давления
		protected var k_near:Number;		//Сила ближнего давления
		protected var rest_density:Number;	//Нулевая плотность
		protected var r:Number;				//Радиус частиц
		protected var rsq:Number;			//Квадрат радиуса
		protected var rinv:Number;			//Обратный радиус
		protected var rinvhalf:Number;		//Половина обратного радиуса
		
		protected var max_springs:int;			//Максимальное число связей для вершины
		protected var kspring:Number;			//Сила пластичных связей
		protected var stretch_speed:Number;		//Скорость сжатия связей
		protected var compress_speed:Number;	//Скорость растяжения связей
		protected var compress_treshold:Number;	//Порог для сжатия связей
		protected var stretch_treshold:Number;	//Порог для растяжения связей
		protected var viscosity_a:Number;		//Параметр трения 1
		protected var viscosity_b:Number;		//Параметр трения 2
		
		protected var activeParticles:Vector.<b2Body>;			//Активный кусок желе
		protected var activeGroup:Vector.<Boolean>;				//Входит ли i-ая точка в желе?
		protected var activeChanged:Boolean;					//Произошло ли добавление/удаление ребра в активной группе?
		
		public var treshold:uint;			//Минимальная прозрачность воды
		public var visible:Boolean;			//Рисуем ли?
		public var canvas:Bitmap;			//Где рисуем
		
		protected var eventDispatcher:EventDispatcher;
		// ========================================================== //
		public function Jello(canvas:Bitmap,particles:IParticleGroup,spacing:Number=20,imageRadius:Number=30,rest_density:Number=1,treshold:uint=0xA0000000, visible:Boolean=true,k:Number=0.02,k_near:Number=2,kspring:Number=0.1,stretch_speed:Number=0.3,stretch_treshold:Number=0.3,compress_speed:Number=0.1,compress_treshold:Number=0.1,viscosity_a:Number=0.5,viscosity_b:Number=0.01,max_springs:int=20):void
		{
			jelloState				=true;
			frozen					=false;
			
			this.max_springs		=max_springs;
			this.kspring			=kspring;
			
			this.stretch_speed		=stretch_speed;
			this.stretch_treshold	=stretch_treshold;
			
			this.compress_speed		=compress_speed;
			this.compress_treshold	=compress_treshold;
			
			this.viscosity_a		=viscosity_a;
			this.viscosity_b		=viscosity_b;
			
			this.k					=k;
			this.k_near				=k_near;
			this.spacing			=spacing;
			this.imageRadius		=imageRadius;
			this.rest_density		=rest_density;
			
			this.treshold			=treshold;
			this.visible			=visible;
			this.canvas				=canvas;
			
			spring_list				=new Spring();
			spring_pool				=new Spring();
			
			eventDispatcher = new EventDispatcher(this);
			
			canvas.stage.addEventListener(KeyboardEvent.KEY_DOWN,keyDown);
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			var i:int;
			var j:int;
			var spring_iji:Vector.<Spring>;
			pt			=Vector.<b2Body>(event.particles);
			ptCount		=pt.length;
			ij			=new Vector.<Vector.<int>>(ptCount,true);
			spring_ij	=new Vector.<Vector.<Spring>>(ptCount,true);
			ns			=new Vector.<Vector.<int>>(ptCount,true);
			nsq1		=new Vector.<Vector.<Number>>(ptCount,true);
			nsq2		=new Vector.<Vector.<Number>>(ptCount,true);
			nsdx		=new Vector.<Vector.<Number>>(ptCount,true);
			nsdy		=new Vector.<Vector.<Number>>(ptCount,true);
			ro			=new Vector.<Number>(ptCount,true);
			ro_near		=new Vector.<Number>(ptCount,true);
			press		=new Vector.<Number>(ptCount,true);
			press_near	=new Vector.<Number>(ptCount,true);
			powerx		=new Vector.<Number>(ptCount,true);
			powery		=new Vector.<Number>(ptCount,true);
			px			=new Vector.<Number>(ptCount,true);
			py			=new Vector.<Number>(ptCount,true);
			vx			=new Vector.<Number>(ptCount,true);
			vy			=new Vector.<Number>(ptCount,true);
			pt_springs	=new Vector.<int>(ptCount,true);
			groupqueue	=new Vector.<int>(ptCount,true);
			activeParticles=new Vector.<b2Body>(ptCount,true);
			activeGroup	=new Vector.<Boolean>(ptCount,true);
			if(ptCount>0)
			{
				activeParticles[0]=pt[0];
				activeGroup[0]=true;
			}
			activeChanged			=false;
			for(i=0;i<ptCount;i++)
			{
				spring_iji=new Vector.<Spring>(i,true);
				for(j=0;j<i;j++)
					spring_iji[j]=null;
				spring_ij[i]=spring_iji;
			}
			
			//Возращаем в пул лишнее
			var spring:Spring;
			spring=spring_pool.next;
			j=0;
			while(spring)
			{
				j++;
				spring=spring.next;
			}
			
			spring=spring_list.next;
			while(spring)
			{
				j++;
				if(!spring.next)
				{
					spring.next=spring_pool.next;
					spring_pool.next=spring_list.next;
					break;
				}
				spring=spring.next;
			}
			spring_list.next=null;
			
			j=max_springs*ptCount*0.5-j;
			for(i=0;i<j;i++)
				spring_pool.next=new Spring(spring_pool.next);
		}
		// ========================================================== //
		//Частицы уничтожены
		protected function particlesKilled(event:ParticleGroupEvent):void
		{
			var i:int;
			var j:int;
			var spring_iji:Vector.<Spring>;
			for(i=0;i<ptCount;i++)
			{
				spring_iji=spring_ij[i];
				for(j=0;j<i;j++)
					spring_iji[j]=null;
				spring_ij[i]=null;
			}
			pt			=null;
			ptCount		=0;
			ij			=null;
			spring_ij	=null;
			ns			=null;
			nsq1		=null;
			nsq2		=null;
			nsdx		=null;
			nsdy		=null;
			ro			=null;
			ro_near		=null;
			press		=null;
			press_near	=null;
			powerx		=null;
			powery		=null;
			px			=null;
			py			=null;
			vx			=null;
			vy			=null;
			pt_springs	=null;
			activeParticles=null;
			activeGroup	=null;
			groupqueue	=null;
			
			var spring:Spring;
			var tmpspring:Spring;
			spring=spring_list.next;
			while(spring)
			{
				tmpspring=spring;
				spring=tmpspring.next;
				tmpspring.next=null;
			}
			
			spring=spring_list.next;
			while(spring)
			{
				tmpspring=spring;
				spring=tmpspring.next;
				tmpspring.next=null;
			}
			event.group.removeEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			event.group.removeEventListener(ParticleGroupEvent.KILLED,particlesKilled);
			notifyGroupKilled();
		}
		// ========================================================== //
		function keyDown(event:KeyboardEvent):void
		{
			if(event.keyCode==70)
			{
				if(jelloState)
				{
					if(frozen)
						kspring*=0.5;
					else
						kspring*=2;
					frozen=!frozen;
				}
			}
			if(event.keyCode==83)
			{
				if(jelloState)
				{
					if(frozen)
					{
						kspring*=0.5;
						frozen=!frozen;
					}
					var i:int;
					var j:int;
					var spring_iji:Vector.<Spring>;
					var spring:Spring;
					
					pt_springs	=new Vector.<int>(ptCount,true);
					for(i=0;i<ptCount;i++)
					{
						spring_iji=new Vector.<Spring>(i,true);
						for(j=0;j<i;j++)
							spring_iji[j]=null;
						spring_ij[i]=spring_iji;
					}
					
					spring=spring_list.next;
					while(spring)
					{
						if(!spring.next)
						{
							spring.next=spring_pool.next;
							spring_pool.next=spring_list.next;
							break;
						}
						spring=spring.next;
					}
					spring_list.next=null;
				}
				jelloState=!jelloState;
			}
		}
		// ========================================================== //
		//Расстояние между точками воды
		public function get spacing():Number
		{
			return _spacing;
		}
		// ========================================================== //
		public function set spacing(_spacing:Number):void
		{
			this._spacing=_spacing;
			r=_spacing*1.25;
			rsq=r*r;
			rinv=1/r;
			rinvhalf=0.5*rinv;
		}
		// ========================================================== //
		//Применить силу к частицам
		public function applyPower():void
		{
			var t1:int=getTimer();
			
			var sqrt:Function=Math.sqrt;
			var floor:Function=Math.floor;
			var min:Function=Math.min;
			var i:int;
			var j:int;
			var l:int;
			var z:int;
			var p:b2Body;
			
			var dx:Number;
			var dy:Number;
			
			var d:Number;
			var dn:Number;
			var qd:Number;
			
			var x1:Number;
			var y1:Number;
			var pxf:Number;
			var pyf:Number;
			var tr:Number;
			
			var q1:Number;
			var q2:Number;
			var q3:Number;
			
			var s1:Number;
			var s2:Number;
			var s3:Number;
			var s4:Number;
			var s5:Number;
			var s6:Number;
			
			var p_x:Number;
			var p_y:Number;
			var v_x:Number;
			var v_y:Number;
			
			var su:String;
			var sv:String;
			
			var n:Vector.<int>;
			var nqd:Vector.<Number>;
			var nd:Vector.<Number>;
			var nq1:Vector.<Number>;
			var nq2:Vector.<Number>;
			var ndx:Vector.<Number>;
			var ndy:Vector.<Number>;
			
			var gi:int;
			var gj:int;
			var gli:int;
			var glj:int;
			var glc:int;
			var ci:int;
			var cj:int;
			var a:Array;
			var b:Array;
			var c:Array;
			var sector_y:Array;
			var sector_yx:Array;
			var sector_yxi:Array;
		
			var iji:Vector.<int>;
			var spring_iji:Vector.<Spring>;
			var spring:Spring;
			var prev:Spring;
			
			var vec1:b2Vec2;
			var vec2:b2Vec2;
			
			sector_y=new Array();
			sector_yx=new Array();
			sector_yxi=new Array();
			
			var t2:int=getTimer();
			for(i=0; i<ptCount; i++)
			{
				p=pt[i];
				vec1=p.GetPosition();
				p_x=vec1.x;
				p_y=vec1.y;
				pxf=p_x*rinvhalf;
				pyf=p_y*rinvhalf;
				
				s1=floor(pxf-0.5);
				s2=floor(pxf+0.5);
				
				dy = pyf + 0.5;
				for (y1=pyf-0.5; y1<=dy; y1++)
				{
					q1=floor(y1);
					j=sector_y.indexOf(q1);
					if(j<0)
					{
						sector_y.push(q1);
						a=new Array();
						sector_yx.push(a);
						b=new Array();
						sector_yxi.push(b);
					}
					else
					{
						a=sector_yx[j];
						b=sector_yxi[j];
					}
					
					j=a.indexOf(s1);
					if(j<0)
					{
						a.push(s1);
						c=new Array();
						b.push(c);
					}
					else
						c=b[j];
					c.push(i);

					j=a.indexOf(s2);
					if(j<0)
					{
						a.push(s2);
						c=new Array();
						b.push(c);
					}
					else
						c=b[j];
					c.push(i);

				}
				
				ns[i]=new Vector.<int>;
				nsq1[i]=new Vector.<Number>;
				nsq2[i]=new Vector.<Number>;
				nsdx[i]=new Vector.<Number>;
				nsdy[i]=new Vector.<Number>;
				
        		ro[i] = 0;
        		ro_near[i] = 0;
				powerx[i]=0;
				powery[i]=0;
				px[i]=p_x;
				py[i]=p_y;
				vec1=p.GetLinearVelocity();
				vx[i]=vec1.x;
				vy[i]=vec1.y;
				
				ij[i]=new Vector.<int>(i,true);
			}
			
			t2=getTimer()-t2;
			var t3:int=getTimer();
			
			spring=null;
			gli=sector_yxi.length;
			for(gi=0;gi<gli;gi++)
			{
				b=sector_yxi[gi];
				glj=b.length;
				for(gj=0;gj<glj;gj++)
				{
					c=b[gj];
					glc=c.length-1;
					for(ci=0;ci<=glc;ci++)
					{
						i=c[ci];
						iji=ij[i];
						s4=ro[i];
						s5=ro_near[i];
						ndx=nsdx[i];
						ndy=nsdy[i];
						nq1=nsq1[i];
						nq2=nsq2[i];
						n=ns[i];
						p_x=px[i];
						p_y=py[i];
						v_x=vx[i];
						v_y=vy[i];
						spring_iji=spring_ij[i];
						z=pt_springs[i];
						
						for(cj=0;cj<ci;cj++)
						{
							j=c[cj];
							if(iji[j]==0)
							{
								dx=px[j]-p_x;
								qd=dx*dx;
								if(qd<rsq)
								{
									dy=py[j]-p_y;
									qd+=dy*dy;
									if(qd<rsq)
									{
										if(jelloState)
											if(!frozen)
												if(spring_iji[j])
													spring=spring_iji[j];
												else if(z<max_springs)
													if(pt_springs[j]<max_springs)
													{
														spring=spring_pool.next;
														/*if(spring)
														{*/
														spring_pool.next=spring.next;
														spring.next=spring_list.next;
														spring.i=i;
														spring.j=j;
														activeChanged||=activeGroup[i]||activeGroup[j];
														spring.l=r;
														/*}
														else
															spring=new Spring(spring_list.next,i,j,r);*/
														spring_iji[j]=spring;
														spring_list.next=spring;
														z++;
														pt_springs[j]++;
													}
										
										d=sqrt(qd);
										
										if(spring)
										{
											spring.d=d;
											if(!frozen)
											{
												q1=spring.l;
												q2=q1*stretch_treshold;
												q3=d-q1;
												if(q3>q2)
													spring.l+=q1*rinv*stretch_speed*(q3-q2);
												else
												{
													q2=q1*compress_treshold;
													q3=d-q1;
													if(q3<-q2)
														spring.l+=q1*rinv*compress_speed*(q3+q2);
												}
											}
										}
										
										if(d>0.01)
										{
											n.push(j);
											
											q1 = 1 - d*rinv;
											q2 = q1*q1;
											q3 = q2*q1;
											s4 += q2;
											s5 += q3;
											ro[j] += q2;
											ro_near[j] += q3;
											nq1.push(q1);
											nq2.push(q2);
											
											q3=1/d;
											dx*=q3;
											dy*=q3;
											if(spring)
											{
												spring.dx=dx;
												spring.dy=dy;
											}
											ndx.push(dx);
											ndy.push(dy);
											
											s3=(v_x-vx[j])*dx+(v_y-vy[j])*dy;
											if(s3>0)
											{
												s1=q1*(viscosity_a+viscosity_b*s3)*s3;
												dx*=s1;
												dy*=s1;
												v_x-=dx;
												v_y-=dy;
												vx[j]+=dx;
												vy[j]+=dy;
											}
											iji[j]=1;
										}
										else
											iji[j]=-1;
									}
									else
										iji[j]=-1;
								}
								else
									iji[j]=-1;
							}
						}
						ro[i]=s4;
						ro_near[i]=s5;
						pt_springs[i]=z;
						vx[i]=v_x;
						vy[i]=v_y;
					}
				}
			}
			
			t3=getTimer()-t3;
			var t4:int=getTimer();
			
			if(jelloState)
			{
				spring=spring_list.next;
				prev=spring_list;
				while(spring)
				{
					i=spring.i;
					j=spring.j;
					s1=spring.l;
					if(s1>r)
					{
						prev.next=spring.next;
						spring_ij[i][j]=null;
						spring.next=spring_pool.next;
						spring_pool.next=spring;
						spring=prev.next;
						pt_springs[i]--;
						pt_springs[j]--;
						activeChanged||=activeGroup[i]||activeGroup[j];
						continue;
					}
					else
					{
						d=spring.d;
						if(d<0)
						{
							dx=px[j]-px[i];
							dy=py[j]-py[i];
							d=sqrt(dx*dx+dy*dy);
							if(d>0.01)
							{
								q1=1/d;
								dx*=q1;
								dy*=q1;
							}
							if(frozen)
							{
								if((d>4*r)||((d>2*r)&&((pt_springs[i]<4)||(pt_springs[j]<4))))
									{
										prev.next=spring.next;
										spring_ij[i][j]=null;
										spring.next=spring_pool.next;
										spring_pool.next=spring;
										spring=prev.next;
										pt_springs[i]--;
										pt_springs[j]--;
										activeChanged||=activeGroup[i]||activeGroup[j];
										continue;
									}
							}
							else
							{
								s2=s1*stretch_treshold;
								s3=d-s1;
								if(s3>s2)
									spring.l+=s1*rinv*stretch_speed*(s3-s2);
								s1=spring.l;
								if(s1>r)
								{
									prev.next=spring.next;
									spring_ij[i][j]=null;
									spring.next=spring_pool.next;
									spring_pool.next=spring;
									spring=prev.next;
									pt_springs[i]--;
									pt_springs[j]--;
									activeChanged||=activeGroup[i]||activeGroup[j];
									continue;
								}
							}
						}
						else
						{
							dx=spring.dx;
							dy=spring.dy;
							spring.d=-1;
						}
						if(d>0.01)
						{
							q1=kspring*(s1-d);// *(1-s1*rinv)
							dx*=q1;
							dy*=q1;
							powerx[j]+=dx;
							powery[j]+=dy;
							powerx[i]-=dx;
							powery[i]-=dy;
						}
					}
					prev=spring;
					spring=spring.next;
				}
			}
			
			t4=getTimer()-t4;
			var t5:int=getTimer();
			if(activeChanged)
			{
				if(jelloState)
				{
					var l:int;
					var s:int;
					var ml:int;
					var g:int;
					var m:int;
					var group:Vector.<int>;
					var groups:Vector.<Vector.<int>>;
					var groupid:Vector.<int>;
					var grouphead:int;
					var groupend:int;
					groups=new Vector.<Vector.<int>>();
					groupid=new Vector.<int>(ptCount,true);
					s=0;
					for(g=1,j=0;j<ptCount;j=g++)
					{
						if(s<ptCount)
							if(groupid[j]==0)
								if(activeGroup[j])
								{
									group=new Vector.<int>;
									grouphead=1;
									groupend=0;
									groupqueue[0]=j;
									groupid[j]=g;
									group.push(j);
									while(groupend<grouphead)
									{
										i=groupqueue[groupend];
										groupend++;
										spring_iji=spring_ij[i];
										
										for(m=0;m<i;m++)
											if(spring_iji[m])
												if(groupid[m]==0)
												{
													groupid[m]=g;
													group.push(m);
													groupqueue[grouphead]=m;
													grouphead++;
												}
										for(m=i+1;m<ptCount;m++)
											if(groupid[m]==0)
												if(spring_ij[m][i])
												{
													groupid[m]=g;
													group.push(m);
													groupqueue[grouphead]=m;
													grouphead++;
												}
										if(grouphead==ptCount)
											break;
									}
									s+=grouphead;
									groups.push(group);
								}
						activeGroup[j]=false;
					}
					
					l=groups.length;
					j=0;
					ml=groups[0].length;
					for(i=1;i<l;i++)
					{
						s=groups[i].length;
						if(s>ml)
						{
							j=i;
							ml=s;
						}
					}
					
					activeParticles=new Vector.<b2Body>(ml,true);
					
					group=groups[j];
					
					for(i=0;i<ml;i++)
					{
						s=group[i];
						activeGroup[s]=true;
						activeParticles[i]=pt[s];
					}
				}
				else
					activeParticles=Vector.<b2Body>(pt);
				notifyGroupChanged();
			}
			
			t5=getTimer()-t5;
			var t6:int=getTimer();
			
			for (i=0; i<ptCount; i++)
			{
				press[i] = k * (ro[i] - rest_density);
				press_near[i] = k_near * ro_near[i];
			}
			
			t6=getTimer()-t6;
			var t7:int=getTimer();
			
			for (i=0; i<ptCount; i++)
			{
				dx=0;
				dy=0;
				
				n=ns[i];
				nq1=nsq1[i];
				nq2=nsq2[i];
				ndx=nsdx[i];
				ndy=nsdy[i];
				s1=press[i];
				s2=press_near[i];
				l=n.length;
				for(j=0; j<l; j++)
				{
					z=n[j];

					dn = (s1 + press[z])*nq1[j] + (s2 + press_near[z])*nq2[j];

					q1=ndx[j]* dn;
					dx+=q1;
					powerx[z] += q1;
					q1=ndy[j]* dn;
					dy+=q1;
					powery[z] += q1;
				}
				powerx[i] -= dx;
				powery[i] -= dy;
			}
			
			t7=getTimer()-t7;
			var t8:int=getTimer();
			
			
			for(i=0; i<ptCount;i++)
			{
				p=pt[i];
				dx=powerx[i];
				dy=powery[i];
				d=sqrt(dx*dx+dy*dy);
				if(d>2)
				{
					d=2/d;
					p.ApplyForceToCenter(dx*d,dy*d);
				}
				else if(d>0.09)
					p.ApplyForceToCenter(dx,dy);
				p.SetLinearVelocity(new b2Vec2(vx[i],vy[i]));
			}
			
			t8=getTimer()-t8;
			
			t1=getTimer()-t1;
			//trace(t1,t2,t3,t4,t5,t6,t7,t8);
		}
		// ========================================================== //
		//Оповестить об изменении частиц
		public function notifyGroupChanged():void
		{
			eventDispatcher.dispatchEvent(new ParticleGroupEvent(ParticleGroupEvent.CHANGED,this));
		}
		// ========================================================== //
		//Оповестить об уничтожении группы частиц
		public function notifyGroupKilled():void
		{
			eventDispatcher.dispatchEvent(new ParticleGroupEvent(ParticleGroupEvent.KILLED,this));
		}
		// ========================================================== //
		//Частицы
		public function getParticles():Vector.<b2Body>
		{
			return activeParticles;
		}
		// ========================================================== //
		//Рисуем жидкость
		public function draw():void
		{	/*
			var sh:Shape=new Shape();
			var g:Graphics=sh.graphics;
			var spring:Spring;
			var p:FluidParticle;
			var q:FluidParticle;
			
			g.clear();
			g.lineStyle(1,0xFFFFFF);
			spring=spring_list.next;
			while(spring)
			{
				p=pt[spring.i];
				q=pt[spring.j];
				g.moveTo(p.xx,p.yy);
				g.lineTo(q.xx,q.yy);
				spring=spring.next;
			}
			*/
			var bmp:BitmapData=canvas.bitmapData;
			var w:uint=canvas.width;
			var h:uint=canvas.height;
			bmp.lock();
			bmp.fillRect(new Rectangle(0, 0, w, h), 0);
			var i:int;
			var p:b2Body;
			var pnt:Point;
			var m:Matrix;
			m=new Matrix();
			var r:Number;
			
			var r1:Rectangle=new Rectangle(0, 0, 2*imageRadius, 2*imageRadius);
			pnt=new Point(0,0);
			for (i=0; i<ptCount; i++)
			{
				p=pt[i];
				pnt.x=px[i]-imageRadius;
				pnt.y=py[i]-imageRadius;
				bmp.copyPixels(p.GetUserData() as BitmapData,r1,pnt,null,null,true);
			}
			var rect:Rectangle=new Rectangle(0, 0, w, h);
			bmp.threshold(bmp,rect, new Point(0, 0), "<", treshold);
			//bmp.draw(sh);
			//bmp.threshold(bmp,rect, new Point(0, 0), ">", 0,0xFF000000+_waterColor);
			//bmp.colorTransform(rect,new ColorTransform(1,1,1,1,0,0,0,255));
			bmp.unlock();
		}
		// ========================================================== //
		public function addEventListener(type:String, listener:Function, useCapture:Boolean = false, priority:int = 0, useWeakReference:Boolean = false):void
		{
			eventDispatcher.addEventListener.apply(null, arguments);
		}
		// ========================================================== //
		public function dispatchEvent(event:Event):Boolean
		{
			return eventDispatcher.dispatchEvent.apply(null, arguments);
		}
		// ========================================================== //
		public function hasEventListener(type:String):Boolean
		{
			return eventDispatcher.hasEventListener.apply(null, arguments);
		}
		// ========================================================== //
		public function removeEventListener(type:String, listener:Function, useCapture:Boolean = false):void
		{
			eventDispatcher.removeEventListener.apply(null, arguments);
		}
		// ========================================================== //
		public function willTrigger(type:String):Boolean
		{
			return eventDispatcher.willTrigger.apply(null, arguments);
		}
		// ========================================================== //
	}
}

//Пластичная связь
class Spring
{
	public var d:Number;
	public var dx:Number;
	public var dy:Number;
	public var l:Number;
	public var i:int;
	public var j:int;
	public var next:Spring;
	// ========================================================== //
	public function Spring(next:Spring=null,i:int=-1,j:int=-1,l:Number=-1):void
	{
		this.i=i;
		this.j=j;
		this.next=next;
		this.l=l;
	}
	// ========================================================== //
}
