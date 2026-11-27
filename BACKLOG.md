# Hari Bersama feature backlog

The redesign follows a review of [temuya.com](https://temuya.com/) on 2026-11-27: its home page, theme previews, the no sign-up builder, the photobooth and camera demos, and the pricing and FAQ pages. Hari Bersama uses its own themes, art and copy. The earlier backlog came from the kondangan.app dashboard review and is covered by the items below.

## Done in the redesign

1. **Try without signing up.** Pick a theme, enter the couple's names, and build. Drafts without an account last 3 days and are claimed after sign-in. [Reference](https://temuya.com/en/coba-tanpa-daftar)
2. **Section builder.** Sections with "needs your details" badges, a visibility switch per field, sample content that only previews show, `@wanita` and `@pria` name variables, drag to reorder, and a live phone and desktop preview where clicking a section opens it. [Reference](https://temuya.com/editor/onboarding)
3. **Themes with envelopes.** Six themes, each with an opening envelope, scenery, photo frames, ornaments and a photobooth frame, plus a gallery with collection filters, search and sort. [Reference](https://temuya.com/en/themes)
4. **Events per guest.** Up to three events, and each guest sees only the events they are invited to. [Reference](https://temuya.com/en/undangan-per-acara)
5. **RSVP, QR and check-in.** Guests who say yes get a QR. The door scans it, with name search, walk-ins, undo and an offline queue as fallbacks. [Reference](https://temuya.com/en/buku-tamu-digital)
6. **Photobooth.** Five layouts, theme frames, a 3-2-1 capture on the guest's phone, and a shared album. [Reference](https://temuya.com/en/photobooth)
7. **Disposable camera.** A roll of 24 shots with no preview, five film looks with a date stamp, and an album the couple opens when ready. [Reference](https://temuya.com/en/disposable-camera)
8. **Guest tools.** CSV and spreadsheet import, CSV export, WhatsApp template, share links for group chats, and wishes the couple can hide. [Reference](https://temuya.com/en/pricing)
9. **Painted opening scenes.** Each theme has its own painted scene, a smaller thumbnail for theme cards, and its SVG art as the fallback. [Reference](https://temuya.com/themes/preview/cat-nap)

## First release

1. **Subscription packages.** Decide what each plan includes (how long an invitation stays online, photo count, guest count, frames, album strips, camera rolls, help). Publishing is free until then, and the FAQ says plans are being prepared. [Reference](https://temuya.com/en/pricing)
2. **Draft cleanup on a schedule.** Unclaimed drafts are removed when a new draft is created. Add a daily cron in the Worker so storage is freed even when no one starts a draft.

## Follow-up releases

4. **Preview link for family.** A link that expires after 1 to 7 days and cannot RSVP or send wishes. [Reference](https://temuya.com/en/coba-tanpa-daftar)
5. **Add-ons.** Extra album strips and camera rolls on top of a plan. [Reference](https://temuya.com/en/pricing?for=photobooth)
6. **More event types.** Birthday and office events reuse the builder with their own sections and themes. [Reference](https://temuya.com/editor/onboarding)
7. **Hijab and no alcohol variants.** Themes that draw people get a hijab option and a variant without wine glasses. [Reference](https://temuya.com/en/themes)
8. **Usher accounts.** Let a helper scan at the door without the couple's login. [Reference](https://temuya.com/en/buku-tamu-digital)
9. **English site.** The invitation already switches between Indonesian and English. Add the same toggle to the site and the Studio. [Reference](https://temuya.com/en)
10. **Notifications.** Tell the couple about new RSVPs and wishes.
11. **Song search.** Bring back the CC0 Openverse search, and look for Indonesian wedding songs with a license that allows reuse.
12. **Set it up for me.** A request form for couples who want help filling in the invitation. [Reference](https://temuya.com/en/pricing)
