import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RetentionDetails } from '../deletion/RetentionDetails'
import {
  retentionDetails,
  type RetentionDetailsData,
} from '../deletion/retention-details'
import { snapshot } from '../deletion/contract'
import { deletionFixture } from './deletion-fixtures'
const data: RetentionDetailsData = {
  noticeState: 'BLOCKED',
  historyTruncated: false,
  history: [{ kind: 'RETENTION_RECORDED', recordedAt: '2027-04-01T00:00:00Z' }],
  exceptions: [
    {
      id: 'id',
      category: 'IMAGE_ATTACHMENT',
      scope: 'LIMITED_DOCUMENT_IMAGES',
      state: 'ACTIVE',
      reasonCode: 'DOCUMENTED_RETENTION',
      publicReason: 'Conservación limitada por decisión documentada.',
      reviewAt: '2027-05-02T00:00:00Z',
      expiresAt: null,
    },
  ],
}
it('renders recorded scope/reason/review and unknown expiry without inventing a deadline', () => {
  render(<RetentionDetails data={data} />)
  expect(
    screen.getByText('Imágenes delimitadas.', { exact: false }),
  ).toBeInTheDocument()
  expect(screen.getByText('2027-05-02 00:00:00 UTC')).toBeInTheDocument()
  expect(screen.getByText('No informado por el servidor')).toBeInTheDocument()
  expect(
    screen.queryByText(/Fundamento administrativo/),
  ).not.toBeInTheDocument()
})
it.each(['ACTIVE', 'REVIEW_DUE', 'EXPIRED'] as const)(
  'uses the server state %s without local calendar inference',
  (state) => {
    const parsed = retentionDetails({
      ...data,
      exceptions: [
        { ...data.exceptions[0], state, reviewAt: '2020-01-01T00:00:00Z' },
      ],
    })
    expect(parsed.exceptions[0].state).toBe(state)
  },
)
it('preserves details in the current query/mutation projection', () => {
  expect(
    snapshot({ ...deletionFixture, retentionDetails: data }).retentionDetails,
  ).toEqual(data)
})
it('removes transport extras and rejects incomplete detail', () => {
  expect(
    retentionDetails({
      ...data,
      secret: 'never',
      exceptions: data.exceptions.map((e) => ({ ...e, secret: 'never' })),
    }),
  ).toEqual(data)
  expect(() =>
    retentionDetails({
      ...data,
      exceptions: [{ ...data.exceptions[0], reviewAt: null }],
    }),
  ).toThrow()
})
it('keeps exact administrative free text inside a labeled administrative section', () => {
  render(
    <RetentionDetails
      data={{
        ...data,
        exceptions: [
          {
            ...data.exceptions[0],
            administrative: {
              purpose: 'Synthetic purpose',
              basis: 'Synthetic basis',
              ownerId: 'Synthetic owner',
              objectId: null,
            },
          },
        ],
      }}
    />,
  )
  expect(
    screen.getByText('Fundamento administrativo privado'),
  ).toBeInTheDocument()
  expect(screen.getByText('Finalidad: Synthetic purpose')).toBeInTheDocument()
})

it('labels H as historical operational closure without replacing current state', () => {
  render(
    <RetentionDetails
      data={{
        ...data,
        history: [
          { kind: 'H_OPERATIONAL_SCOPE', recordedAt: '2027-05-02T00:00:00Z' },
        ],
      }}
    />,
  )
  expect(screen.getByText(/Cierre operativo comprobado/)).toBeInTheDocument()
  expect(screen.getByText(/no sustituye el estado actual/)).toBeInTheDocument()
})
