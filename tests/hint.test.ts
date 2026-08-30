import { expect, it } from 'vitest';
import { HintService, nextWaypoint } from '../src/game/systems/HintService';
import type { Level } from '../src/game/types';
import { hasLineOfSight, isWalkable } from '../src/game/systems/Geometry';

it('hints ahead of the nearest route segment, not back toward spawn', () => {
  const route = [{x:1,y:9},{x:1,y:5},{x:5,y:5},{x:5,y:1}];
  expect(nextWaypoint({x:3,y:5}, route)).toEqual({x:5,y:5});
  expect(nextWaypoint({x:5,y:2}, route)).toEqual({x:5,y:1});
});
it('supports empty and single waypoint routes without throwing', () => {
  expect(nextWaypoint({x:0,y:0}, [])).toBeNull();
  expect(nextWaypoint({x:0,y:0}, [{x:4,y:2}])).toEqual({x:4,y:2});
});

const cornerLevel: Level = {
  id: 1,name:'Corner',chapter:'Test',map:{width:6,height:6},player:{x:1,y:1},exit:{x:5,y:1},
  walls:[{x:2,y:0,w:1,h:2}],enemies:[],traps:[],securityLights:[],lightEnergyEnabled:false,
  parTime:10,lightBudget:2,solution:[{x:5,y:1}],hint:'Around the corner.',
};

it('prepends the spawn and points an off-route player around walls', async () => {
  const service = new HintService();
  const waypoint = await service.request({x:1,y:1}, cornerLevel);
  expect(waypoint).not.toEqual(cornerLevel.solution[0]);
  expect(isWalkable(waypoint!, cornerLevel)).toBe(true);
  expect(hasLineOfSight({x:1,y:1}, waypoint!, cornerLevel.walls, .2)).toBe(true);
});

it('returns no hint when a waypoint is unreachable', async () => {
  const blocked: Level = {...cornerLevel, walls:[{x:0,y:2,w:6,h:1}]};
  const service = new HintService();
  expect(await service.request({x:1,y:1}, {...blocked, solution:[{x:1,y:4}]})).toBeNull();
});

it('does not reveal a route when authorization is denied', async () => {
  const service = new HintService(async () => false);
  expect(await service.request({x:1,y:1}, cornerLevel)).toBeNull();
});
