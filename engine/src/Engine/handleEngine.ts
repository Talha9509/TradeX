import { CreateOrder } from '../Options/CreateOrder'
import { CancelOrder } from '../Options/CancelOrder'
import { GetOrder } from '../Options/GetOrder'
import { GetBalance } from '../Options/GetBalance'
import { type EngineRequest } from '../Types/EngineTypes'
import { GetDepth } from '../Options/GetDepth'
import snapshot from '../snapshot/snapshot'
import EngTodb from '../utils/EngTodb'

export default async function handleEngine(engineReq: EngineRequest) {
  let changesCount = 0;
  if(engineReq.function == 'create_order'){
    const result = await CreateOrder(engineReq.payload, engineReq.userId)
    void snapshot(result.updatedAsks, result.updatedBids, result.asset, changesCount).catch((err) => {
      console.error("Snapshot failed:", err);
    });

    // EngTodb(result)
    console.log({ order: result.order, fills: result.fills })
    return { order: result.order, fills: result.fills }
  }
  
  else if(engineReq.function == 'cancel_order'){
    const result = await CancelOrder(engineReq.payload, engineReq.userId)
    console.log(result)
    void snapshot(result.updatedAsks, result.updatedBids, result.asset, changesCount).catch((err) => {
      console.error("Snapshot failed:", err);
    });

    EngTodb(result)
    return { order: result.order }
  }

  else if(engineReq.function == 'get_order'){
    const result = await GetOrder(engineReq.payload, engineReq.userId)
    console.log(result)
    return result
  }
  
  else if(engineReq.function == 'get_user_balance'){
    const result = await GetBalance(engineReq.userId)
    console.log(result)
    return result
  }

  else if(engineReq.function == 'get_depth'){
    const result = await GetDepth(engineReq.payload, changesCount)
    console.log(result)
    return result
  }

}