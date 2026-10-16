const clientId = "62fa78e01de64ba2ba5d6be54292fa29"; 
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

let token = localStorage.getItem("access_token");
let expireIn = localStorage.getItem("expire_in");

if (token !== null && expireIn !== null) {

    if (Date.now() > parseInt(expireIn)) {
        const newToken = await getRefreshToken(clientId);
        const profile = await fetchProfile(newToken);
        populateUI(profile);
        const artists = await getFollowedArtists(newToken);
        populatesUI(artists);
    } else {
        const profile = await fetchProfile(token);
        populateUI(profile);
        const artists = await getFollowedArtists(token);
        populatesUI(artists);

    }

} else if (!code) {

    redirectToAuthCodeFlow(clientId);

} else {

    const accessToken = await getAccessToken(clientId, code);

    localStorage.setItem("access_token", accessToken);

    const profile = await fetchProfile(accessToken);
    populateUI(profile);
            const artists = await getFollowedArtists(accessToken);
        populatesUI(artists);

}


export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://127.0.0.1:5173/callback");
    params.append("scope", "user-read-private user-read-email user-follow-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location =
        `https://accounts.spotify.com/authorize?${params.toString()}`;
}


function generateCodeVerifier(length: number) {
    let text = '';
    let possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(
            Math.floor(Math.random() * possible.length)
        );
    }

    return text;
}


async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);

    const digest = await window.crypto.subtle.digest(
        'SHA-256',
        data
    );

    return btoa(
        String.fromCharCode.apply(
            null,
            [...new Uint8Array(digest)]
        )
    )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


export async function getAccessToken(
    clientId: string,
    code: string
): Promise<string> {

    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();

    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://127.0.0.1:5173/callback");
    params.append("code_verifier", verifier!);

    const result = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
        }
    );

    const {
        access_token,
        refresh_token,
        expires_in
    } = await result.json();

    const timestamp = Date.now() + expires_in * 1000;

    localStorage.setItem(
        "expire_in",
        JSON.stringify(timestamp)
    );

    localStorage.setItem(
        "refresh_token",
        refresh_token
    );

    return access_token;
}


export async function getRefreshToken(
    clientId: string
): Promise<string> {

    const refreshToken = localStorage.getItem("refresh_token");

    const params = new URLSearchParams();

    params.append("client_id", clientId);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken!);

    const result = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
        }
    );

    const {
        access_token,
        refresh_token,
        expires_in
    } = await result.json();

    const timestamp = Date.now() + expires_in * 1000;

    localStorage.setItem(
        "expire_in",
        JSON.stringify(timestamp)
    );

    localStorage.setItem(
        "access_token",
        access_token
    );

    if (refresh_token) {
        localStorage.setItem(
            "refresh_token",
            refresh_token
        );
    }

    return access_token;
}


async function fetchProfile(token: string): Promise<any> {

    const result = await fetch(
        "https://api.spotify.com/v1/me",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return await result.json();
}


function populateUI(profile: any) {

    document.getElementById("displayName")!.innerText =
        profile.display_name;

    if (profile.images[0]) {
        const profileImage = new Image(200, 200);

        profileImage.src = profile.images[0].url;

        document
            .getElementById("avatar")!
            .appendChild(profileImage);
    }

    document.getElementById("id")!.innerText =
        profile.id;

    document.getElementById("email")!.innerText =
        profile.email;

    document.getElementById("uri")!.innerText =
        profile.uri;

    document
        .getElementById("uri")!
        .setAttribute(
            "href",
            profile.external_urls.spotify
        );

    document.getElementById("url")!.innerText =
        profile.href;

    document
        .getElementById("url")!
        .setAttribute(
            "href",
            profile.href
        );

    document.getElementById("imgUrl")!.innerText =
        profile.images[0]?.url ?? '(no profile image)';
}


async function getFollowedArtists(token: string): Promise<any> {

    const result = await fetch(
        "https://api.spotify.com/v1/me/following?type=artist",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return await result.json();
}


function populatesUI(artist: any) {
    const container = document.getElementById("artists")!;

    for (let i = 0; i < artist.artists.items.length; i++) {
        const item = artist.artists.items[i];

        const card = document.createElement("div");
        card.className = "artist-card";

        const name = document.createElement("p");
        name.innerText = item.name;
        card.appendChild(name);

        if (item.images?.[0]?.url) {
            const photo = document.createElement("img");
            photo.src = item.images[0].url;
            photo.alt = item.name;
            card.appendChild(photo);
        }

        const link = document.createElement("a");
        link.href = item.external_urls.spotify;
        link.innerText = "Voir sur Spotify";
        link.target = "_blank";
        card.appendChild(link);

        container.appendChild(card);
    }
}


async function getMusic(token: string, url?: string): Promise<any> {
    const input = document.getElementById("searchInput") as HTMLInputElement;

    const result = await fetch(
        url ?? "https://api.spotify.com/v1/search?q=" + encodeURIComponent(input.value) + "&type=track&limit=10&offset=0",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return await result.json();
}

function populateSearchUI(search: any) {
    const container = document.getElementById("search")!;
    
if (search.tracks.next !== null) {
    const next = document.createElement("button");
    next.innerText = "Suivant";

    next.addEventListener("click", async () => {
        const nextSearch = await getMusic(token!, search.tracks.next);
        container.innerHTML = "";
        populateSearchUI(nextSearch);
    });

    container.appendChild(next);
}

    for (let i = 0; i < search.tracks.items.length; i++) {

        const item = search.tracks.items[i];

        const card = document.createElement("div");
        card.className = "music-card";

        const name = document.createElement("p");
        name.innerText = item.name;
        card.appendChild(name);

        const link = document.createElement("iframe");
        link.src = `https://open.spotify.com/embed/track/${item.id}`;

        container.appendChild(card);
        card.appendChild(link)
    }
}
document.getElementById("searchButton")?.addEventListener("click", async () => {
    const search = await getMusic(token);
    populateSearchUI(search);
});

