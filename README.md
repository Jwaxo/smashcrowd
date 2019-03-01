# SmashCrowd: A Node.JS Smash Bros Drafting App

### What the heck is this?

The question arose among a regular group of players of Smash Ultimate: how do we
replicate the cool functionality of [Smashdown](https://www.ssbwiki.com/Smashdown)
online, which, currently, lacks a robust set of features? Several iterations of
ideas were talked over, before settling upon the idea of choosing characters via
draft beforehand. Each play would, one at a time, reserve a character for a match,
until all characters were chosen or a maximum number of matches was reached.

How to go about doing THAT then? Paper and pencil would be tedious and potentially
lead to accidental duplications; spreadsheets are lame; using one of the online
[tierlist creators](https://ssbworld.com/create/tier-list/ultimate/) would be visually
appealing but impossible to share until it was complete.

And thus the idea to develop our own app was born.

tl;dr: SmashCrowd allows you to create a mini tournament draft for any number of
players in Super Smash Bros Ultimate.

### How do I run it?

SmashCrowd was created with Node.js v8.11.2 and NPM v6.8.0 (if that matters).
To get it running on your own server:

1. `npm install`
2. `node index.js`

It should be that simple. Then connect to `127.0.0.1:8080` in your browser and
you should see the SmashCrowd main page.

### How do I use it?

*To be filled in.*

### How do I work on it?

**Node.JS (server)**:
Currently all of the main JS is stored in index.js; this will probably be spread
out a bit as new features get expanded upon.

**Frontend JS (client)**:
Located under public/client.js, this is what the browser runs. Ideally this will
be where we detect changes to form items, moved characters, etc, then send that
info back to the server.

**Styles**:
We use Foundation for some slightly pretty styles to be slapped on everything else,
compiled from SCSS to public/css/app.css. To modify it, look in scss/app/scss.
This could be updated to use Gulp in order to watch the files, but until then,
the SCSS only gets recompiled when the server is started.

### Planned features

* Dynamic player creation.
* Player label customization.
* Automatic designation of "whose pick" it is.
* Multiple styles of drafting:
  * Linear
  * Snake
  * Auction?
* Drag-and-drop arrangement.
* Multiple drafts per server.
