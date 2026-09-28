---
title: Caching is a bet about the future
tag: technology
source: cognite-original
---

A cache stores an answer you think you will need again. Your browser caches images so a second visit is faster. A CPU caches recently used memory so it does not walk all the way to RAM. A news app caches headlines so it can open on a train.

Every cache is a bet: that the future will look enough like the past. When the bet is right, you save time and energy. When it is wrong, you show stale data, serve an old price, or hide a security fix. Cache invalidation — deciding when a stored answer is no longer trustworthy — is famously hard because the world does not send a single, clean "this changed" signal.

There are simple policies. Time-to-live expires an item after a number of minutes. Least-recently-used discards whatever nobody asked for. Write-through updates the cache whenever the source of truth changes. None of these policies is universally best. A weather forecast can be a few minutes late. A bank balance should not be.

For a small product, the useful lesson is restraint. Cache what is expensive and slow to change. Do not cache secrets in a place you cannot lock. And remember that a cache is not knowledge; it is a convenience copy. If you cannot explain how an item becomes invalid, you are not caching. You are hoping.
