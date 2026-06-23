# Direct Messaging

A messaging system letting users chat 1-on-1 or in named group conversations with friends and anyone they share a battle or campaign with. Live updates, typing indicators, and read receipts included.

## Where it lives

- **Header icon** (next to Friends/Notifications): unread badge + slide-out panel for quick replies, conversation list, and active thread.
- **`/messages` page**: full inbox — left rail of conversations, right pane of the open thread, "New message" / "New group" actions.
- Both surfaces share the same data and components.

## Eligibility rules

A user can start or be added to a conversation with another user only if at least one of these is true:
- They are friends (accepted `friendships` row).
- They are both participants in the same active battle (`battle_participants`).
- They are both participants in the same campaign (`campaign_participants`).

Server-side check via a `can_message(user_a, user_b)` security-definer function used by RLS and the "start conversation" RPC.

## Conversation model

- **Direct (1-on-1)**: deterministic — one conversation per user pair, reused on reopen.
- **Group**: named, multi-user, creator becomes admin, can add/remove eligible members later.

## Features

- Conversation list sorted by last activity, unread badge per row
- Thread view with infinite scroll back, optimistic send, edit/delete own message
- **Typing indicator** via Realtime broadcast channel (no DB writes)
- **Read receipts** via `last_read_at` per participant; "Seen" shown on the latest message read by everyone else
- **Realtime** message insert/update/delete via `postgres_changes` on the active conversation
- Unread counts everywhere update live
- Empty/blocked states ("You can only message friends or people in your battles/campaigns")

## Technical details

### New tables

- `conversations` — `id`, `type` (`direct`|`group`), `name` (group only), `created_by`, `created_at`, `last_message_at`
- `conversation_participants` — `conversation_id`, `user_id`, `role` (`member`|`admin`), `joined_at`, `last_read_at`, `muted`
- `messages` — `id`, `conversation_id`, `sender_id`, `body` (encrypted via existing `encrypt_field`), `created_at`, `edited_at`, `deleted_at`
- Decrypted view `messages_decrypted` for reads (same pattern as characters/stories)

### Realtime

- `ALTER PUBLICATION supabase_realtime ADD TABLE messages, conversation_participants;`
- Typing: ephemeral `broadcast` events on channel `conv:{id}` — no DB writes
- Read receipts: update `conversation_participants.last_read_at` on thread focus

### Functions

- `can_message(user_a uuid, user_b uuid) returns boolean` — friends OR shared battle OR shared campaign
- `start_direct_conversation(other_user uuid) returns uuid` — finds-or-creates the canonical direct conversation, enforces `can_message`
- `create_group_conversation(name text, member_ids uuid[]) returns uuid` — enforces `can_message` for every member, inserts participants
- `mark_conversation_read(conversation_id uuid)` — sets `last_read_at = now()`

### RLS

- `conversations`: SELECT/UPDATE only if `auth.uid()` is in `conversation_participants`
- `conversation_participants`: SELECT rows of conversations you're in; INSERT/DELETE only via the RPCs above (admins for groups)
- `messages`: SELECT if you're a participant; INSERT if you're a participant and `sender_id = auth.uid()`; UPDATE/DELETE own messages only
- Standard `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` on every public table; `GRANT ALL ... TO service_role`

### Frontend

- `src/hooks/use-conversations.ts` — list + unread counts, realtime subscription
- `src/hooks/use-conversation.ts` — single thread messages, send/edit/delete, typing broadcast, read receipts
- `src/components/messaging/MessagesPanel.tsx` — header slide-out (mirrors `FriendsPanel` pattern)
- `src/components/messaging/ConversationList.tsx`, `ConversationThread.tsx`, `NewConversationDialog.tsx`, `NewGroupDialog.tsx`
- `src/pages/Messages.tsx` — full inbox at `/messages`, route added in `App.tsx`
- Header: add Messages icon with unread badge in `MainLayout`
- Friend row + battle/campaign participant rows get a "Message" action that calls `start_direct_conversation`

### Out of scope (this pass)

- File/image attachments
- Message reactions
- Push notifications outside the app (in-app toasts only)
- Blocking users (separate feature)
