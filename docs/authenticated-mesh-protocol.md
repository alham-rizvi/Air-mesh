# Authenticated Offline Mesh Protocol

## Scope

This protocol adds three control-plane capabilities to Air-Mesh without granting relays access to message plaintext: authenticated **route advertisements**, persistent **relay queues**, and authenticated **delivery receipts**. It applies only after users have completed local key pairing. It does not establish a distance guarantee, background-delivery guarantee, confidential group broadcast protocol, or physical-radio proof.

## Envelope classes

| Envelope | Link/recipient authentication | Relay visibility | Persistent state |
|---|---|---|---|
| Direct encrypted message | Sender and final recipient shared secret | Destination, sender, TTL, opaque encrypted payload | Sender outbox; relay queue if forwarded. |
| Route advertisement | Direct-neighbor shared secret | Route destinations and hop counts | Routing table with update time. |
| Delivery receipt | Original sender and recipient shared secret | Referenced message ID, return destination, TTL | Receipt record; sender message status changes to `delivered` only after verification. |

Route advertisements are authenticated to the immediate neighbor, then merged with the receiving node’s own hop increment. They are not trusted merely because another device broadcasts a route. Receipt authenticity is end-to-end: the final recipient authenticates the referenced message ID using the original sender/recipient shared secret, allowing relays to forward an opaque receipt without forging recipient delivery.

## State transitions

```text
Queued  -> Accepted  -> Delivered
  |          |             |
  |          |             +-- verified recipient receipt only
  |          +-- immediate local transport accepted an envelope
  +-- durable local outbox or relay queue; no eligible hop accepted it
```

An outgoing message is stored before its first attempt. A relay stores an unmodified encrypted envelope before forwarding it. A receipt does not create a read receipt. `Delivered` never means merely that a relay, GATT characteristic, or Wi-Fi Direct socket accepted an item.

## Deterministic no-hardware test boundary

The automated scenario uses **two end-user personas**—Alice and Bob—plus a deterministic relay node. It has no network, radio, internet, Bluetooth, Wi-Fi Direct, or external hardware dependency. The relay is required because a multi-hop path cannot exist with only two nodes. The test covers route exchange, queued forwarding, duplicate suppression, end-to-end receipt verification, and recovery when the final hop becomes available.

## Physical release gate

Two or more physical Android phones must still verify route exchange, queue persistence across app lifecycle changes, relay delivery, and receipt return paths. The deterministic simulation proves the protocol flow only; it cannot prove GATT/Wi-Fi Direct interoperability, radio range, background behavior, or phone-specific permission/lifecycle behavior.
