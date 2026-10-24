// Everything that can be bought, in naira. Shared by the game (to show the
// shop) and by /api/verify-payment (to check the amount Paystack charged).
// None of these give a gameplay advantage: they are cosmetic or hosting perks.

export const ITEMS = [
  { id: "emotes_basic", name: "Gbedu Emotes", price: 500, tag: "Emotes",
    desc: "5 emotes for the lobby and the map: Shaku Shaku, Zanku, Sapa Cry, Facepalm and Odogwu Pose." },
  { id: "nametag_glow", name: "Glow Name Tag", price: 1000, tag: "Style",
    desc: "Make your name glow gold, green or pink above your head so everybody knows you." },
  { id: "luggage_pack", name: "Exit Bags", price: 1500, tag: "Style",
    desc: "Leave in style when you get voted out: designer bag, Bagco sack or a cooler of jollof." },
  { id: "owambe_pack", name: "Owambe Collection", price: 2500, tag: "Outfits",
    desc: "Lace and velvet fabrics, a gold colour for every outfit and gele, and the Owambe Agbada." },
  { id: "pet_pack", name: "Compound Pets", price: 3500, tag: "Pets",
    desc: "A goat, a chicken or a cat that follows you around the compound and the danfo." },
  { id: "detty_pass", name: "Detty December Pass", price: 5000, tag: "Season pass",
    desc: "The Christmas Agbada, Santa fila, the festive red and white colours, plus Gbedu Emotes and the Glow Name Tag." },
  { id: "pro_rooms", name: "Private Room Pro (30 days)", price: 10000, tag: "Hosting",
    desc: "Host private rooms of up to 15 players and pick 3-minute meetings. Great for church groups, offices and hostels." },
  { id: "mega_bundle", name: "Owambe Mega Bundle", price: 20000, tag: "Best value",
    desc: "Every emote, name tag, exit bag, outfit, pet and the Detty December Pass, plus the Gold Crown and Gold Agbada you can only get here. Save over 30%." },
];

// What each purchase unlocks.
export const INCLUDES = {
  detty_pass: ["detty_pass", "emotes_basic", "nametag_glow"],
  mega_bundle: ["emotes_basic", "nametag_glow", "luggage_pack", "owambe_pack", "pet_pack", "detty_pass"],
};

// Ad packages that brands, businesses and musicians can buy. Each runs for 7 days.
export const AD_PACKAGES = [
  { id: "ad_loading", name: "Round sponsor", price: 10000, kinds: ["product", "business", "music"],
    desc: "Your logo and line on the role screen at the start of rounds, and on the main menu. Needs an image." },
  { id: "ad_radio", name: "Danfo radio", price: 15000, kinds: ["music", "business", "product"],
    desc: "Your song or jingle plays on the danfo radio and in the motor park, with a Now Playing banner. Needs an MP3." },
  { id: "ad_billboard", name: "Compound billboard", price: 25000, kinds: ["product", "business", "music"],
    desc: "A billboard in the middle of the compound yard and in the lobby that every player walks past. Needs an image." },
  { id: "ad_wrap", name: "Danfo wrap", price: 40000, kinds: ["product", "business", "music"],
    desc: "Your brand painted on the danfo in Danfo mode, the parked danfo in the compound and the motor park. Needs an image." },
];

export const PRICE_OF = Object.fromEntries([...ITEMS, ...AD_PACKAGES].map((x) => [x.id, x.price]));
