---
title: Why APIs feel like doors
tag: technology
source: cognite-original
---

An API, or application programming interface, is a contract. One program promises that if you ask for something in a particular shape, it will answer in a particular shape. You do not need to know how the other program stores data, which language it uses, or which server room it lives in. You only need the contract.

That is why APIs feel like doors. A well-designed door has a handle you can find in the dark. A well-designed API has endpoints, methods, and error messages that stay stable. When the door is moved without warning, every caller trips. That is the social meaning of "breaking change."

REST-style HTTP APIs became popular because the web already knew how to GET, POST, PUT, and DELETE resources. JSON became a common body format because it is readable by both humans and machines. None of this is magic. It is a shared vocabulary that lets a Chrome extension talk to a local server, or a weather app talk to a national agency.

The important design choice is not cleverness. It is what you refuse to expose. An API that accepts a user's interests and a reading length does not need the URL of the page they were scrolling. Smaller contracts leak less, fail less, and stay easier to reason about. Technology is often improved by sending less.
