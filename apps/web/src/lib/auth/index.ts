import { sessions, users } from '@latitude-data/core'
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle'
import db from '$/db/database'
import { Lucia } from 'lucia'

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users)

interface DatabaseUserAttributes {
  email: string
}

interface DatabaseSessionAttributes {
  currentWorkspaceId: number
}

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
    }
  },
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: DatabaseUserAttributes
    DatabaseSessionAttributes: DatabaseSessionAttributes
  }
}
