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

1. `cp config/default.json config/production.json`  
   Any variables you don't define in `production.json` will be automatically
   read from `default.json`
1. `vim config/production.json`
1. Update the file so that the "database.connection" information matches your database.  
   If you require assistance setting up a MySQL server and database, follow
   [these](https://dev.mysql.com/doc/mysql-getting-started/en/) instructions, or
   see your website host for additional information.
1. `export NODE_ENV=production`  
   This tells the config module that you need to read from `production.json`.
   You can also add this to your bash profile if you need to make the variable
   permanent.
1. `npm install`
   If you do not yet have a database set up, this may take a while.
1. `node .`

It should be that simple. Then connect to `127.0.0.1:8080` in your browser and
you should see the SmashCrowd main page.

### How do I use it?

Although the features of SmashCrowd are sure to be changing in the near future,
we are at Minimum Viable Product as of version 1.0.0, and the following features
should remain standard throughout SmashCrowd's lifetime.

1. The first thing you'll need to do is add a player (or several!) to the board.
Do this by typing a name into the "Add a Player" box, then hitting Enter.
1. Add as many players to the board as you will have competing in your Smash game.
1. Click the blue "Be This Player" button next to the name you wish to represent.
You can swap freely to any slot that is not currently occupied by another user.
Use this method to test it out, or to fill in for players who can only act via
proxy!
1. Once all players are created, the **active** player, outlined in red, gets
the first choice of characters to add to their roster. Clicking on a character in
the big selection box adds them to your roster. *Currently, all choices are final,
so be sure before you pick!*
1. Once the currently active player has picked a character, the draft moves on to
the next player in the list!
1. Since SmashCrowd uses "[snake draft](https://www.dummies.com/sports/fantasy-sports/fantasy-football/understanding-fantasy-football-snake-and-auction-drafts/)"
to pick characters, once the final player in the list has chosen a character,
when the next round starts, all players reverse picking order.
1. Once you're done with everything, or if anything gets borked, smack that "Reset
All" button at the top. It should set it all back to zero.

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

### Planned features/Todo

* Teams.
* ~~Simple stage voting.~~
  * Option for anonymous voting or registered.
  * Remove stage votes when a player is deleted...
  * Display which stages have most votes
  * Ban/vote against/pick-and-ban
* ~~User Profiles~~
  * User and character stat-tracking
  * Player label customization.
* Stage and roster shuffling.
* Option for viewers (on streaming services or anonymously) to pick characters, levels, rules.
* Player boxes shake when they become active.
* Multiple drafts per server.
  * Can set them up like Discord channels, where "rooms" you're in show up on the side.
* Game options:
  * "Score Card" style, used just for tracking games/characters.
  * Character limiting options: "None", "Per-Player", "Per-Board"
  * Squad-strike
    * Winner gets to keep a character
    * Optional life tracking, where SmashDown says how many lives this character currently has?
  * Re-orderable roster
  * Players per round with rotating sit out player
  * More styles of drafting:
    * Iron Man (where you can't advance to the next character until you "win" (with win being definable), but it gradually widens your character choices as you lose)
    * Linear
    * Auction?
  * Game title
* Extra stat options
  * Save match outcomes with other registered players, regardless of whether a 'proper' roster was made and stored (requires other player consent)
  * Some sort of automated analysis. If one player constantly wins against a single other player, but doesn't win ever against anyone else, they have a lower score.
* Trades
* Drag-and-drop arrangement.
* Cursor becomes Smash Bros hand when over characters.
