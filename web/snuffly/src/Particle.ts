import { Body } from "./Box2D";
import { Spring } from "./Jello";

export type Vector ={
	readonly x: number;
	readonly y: number;
};

export type Particle = {
	body: Body; //Частицы желе
	ij: number[]; //Просмотрена ли пара соседей ij(0-не просмотрена, 1-они соседи, -1-не соседи)?
	spring_ij: (null | Spring)[]; //Связь между частицами i и j(null, если её нет)


	//Соседи i-ой частицы 
	ns: number[]; //Индексы соседей частицы
	nsq1: number[]; //q1
	nsq2: number[]; //q2      - для SPH модели
	nsd: Vector[]; //вектор между точками частицами i и j

	//Параметры каждой частицы
	ro: number; //Дальняя плотность
	ro_near: number; //Ближняя плотность
	press: number; //Дальнее давление
	press_near: number; //Ближнее давление
	power: Vector; //Суммарные силы от связей и давления
	p: Vector; //Координаты
	v: Vector; //Скорость
	pt_springs: number; //Число связей у частицы
	pt_state: number; //Состояние частицы(0-липкая, 1-упругая, 2-жидкая)

	groupqueue: number; //Очередь для выделения компоненты связности
	activeGroup: boolean; //Входит ли i-ая точка в активный кусок желе?
};
