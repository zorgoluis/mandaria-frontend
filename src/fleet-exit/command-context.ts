import { createContext, useContext } from 'react'
import type { Body, Operation } from './types'
export const CommandContext = createContext({
  blocked: true,
  prepare: (_op: Operation, _id: string, _body: Body) => {
    void _op
    void _id
    void _body
  },
  deny: (_endedContext = false) => {
    void _endedContext
  },
})
export const useExitCommands = () => useContext(CommandContext)
