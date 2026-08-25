import persistData from './persistance'
import { storeClient } from '../config/redis'
import { lastId } from '../index'
import EngToWS from '../utils/EngToWS'
import type { market, updatedAsksBids } from '../Types/types';


export default async function snapshot(updatedAsks: updatedAsksBids, updatedBids: updatedAsksBids, asset: market, changesCount: number) {
  changesCount++

  console.log(updatedAsks)
  console.log(updatedBids)
  EngToWS(changesCount, updatedAsks, updatedBids, asset)

  if (changesCount % 50 !== 0) return
  await persistData(lastId)

  try {
    await storeClient.sendCommand(['BGSAVE'])
    console.log('snapshot is starting')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Background save already in progress')) {
      console.log('Redis snapshot already in progress. Engine state is saved in Redis memory; skipping this snapshot.')
      return
    }
    throw error
  }
}