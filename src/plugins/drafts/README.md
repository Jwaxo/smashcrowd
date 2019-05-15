# So You Want a New Draft Type

Great! This is one of the more powerful ways to extend the functionality of
SmashCrowd. Drafts control a lot of how the various picking processes work.

To start plugging in your own draft style, follow these steps:

1. Copy one of the existing smashcrowd-[draft type]Draft.js files.
2. Rename the word before "Draft" with a lowercase version of your machine name for your new draft style (example: smashcrowd-foobarDraft.js)
3. Update the class `extends` keyword to extend off of a different class, or keep it extending the default `Draft` type.
4. Change the `machine_name` and `label` of your draft to something more appropriate.
5. Update the system settings of DraftCrowd to know that it should be offering a new draft type. See smashcrowd-updates.js under postInstall for an example; that function sets 'snake' and 'free' as the two options.
6. Change the logic of your new draft style in order to handle the various stages a Draft can go through!

Each stage of a Draft is defined either in the `draftfactory` default, or by your
own draft by overriding the statusTypes array with more states. When a state is
reached, `continue[State]` is ran. `start[State]` is used if the server is shut
down and a board needs to be completely rebuilt from the database.

Use Snake Draft and Free Pick as two examples of how to build out a drafting style,
and good luck!
