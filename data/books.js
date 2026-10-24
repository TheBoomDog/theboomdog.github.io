// Shared book catalog: add a book record and its chapter sources here. Reader and book pages update automatically.
window.NOVELHUB_BOOKS = [
  {
    id: "mol",
    title: "Mother of Learning",
    author: "Domagoj Kurmaic (nobody103)",
    status: "Completed",
    genres: ["Fantasy", "Time Loop", "Magic"],
    description: "Zorian Kazinski is a young mage caught in a repeating month. He must learn why the loop exists and how to escape it.",
    cover: { start: "#455744", end: "#16251e", ink: "#e5cc9f" },
    chapters: ["Good Morning Brother","Life’s Little Problems","The Bitter Truth","Stars Fell","Start Over","Concentrate and Try Again","Of Gaps And Pretending","Perspective","Cheaters","Overlooked Details","Limiters","Soul Web","Any Second Now","The Sister Effect","Busy Friday","We Need To Talk","Sympathy for the Spider","The Pact is Sealed","Tangled Webs","A Matter of Faith","Wheel of Fortune","Complications","Lighting the Fuse","Smoke and Mirrors","The Unexpected","Soulkill","Cast Adrift","Cauldron","The Hunters and the Hunted","A Game of Shops","Marked","Alternatives","Gateways","Unreasonable Things","Mistakes Have Been Made","A Battle of Minds","Slow Burn","Return to Cyoria","Suspicious Coincidences","Shifting Tracks","Myriad Clashing Motives","Sum of its Parts","Overwhelmed","A Show of Trust","Fine Structures","The Other Side","Politics","Well of Souls","Substitution","Containment","Out of Control","Things Fall Apart","Phantoms","The Gate Is Barred","Threshold","Obscure","Unwanted","Questions and Answers","One Step Forward","Into the Abyss","Anthills","Improperly Used","The March of Days","Distance","Dangerous Ground","Marred Perfection","Convergence","Green Hell","Ruin","Carried Away","Shadows of the Past","Crossroads","Plodding Ahead","The Return","Soul Stealer","Critical Blunder","Testing","Grinding Stone","Crime and Evading Punishment","Enemies","A Civil Conversation","Ancient Circles","Scorpion","Powerless","Critical Mass","A New World","Agents of the Crown","Mysterious Ways","Victory","Change of Plans","A Path Paid in Blood","The Scramble","Shelter in the Storm","Ghosts","Betrayer","Contract","Illusory","Beneath the Surface","Powderkeg","Sacrifice","The Switch","Giants","Window of Opportunity","I Win (I)","I Win (II)","I Win (III)","Epilogue","Afterword"].map((title, index) => {
      const number = index + 1;
      return {
        number,
        label: number === 107 ? "Epilogue" : number === 108 ? "Afterword" : "Chapter " + number,
        title,
        source: "Novels/Mother_Of_Learning/chapter_" + number + ".html",
        href: "reader.html?id=mol&chapter=" + number
      };
    })
  }
];
