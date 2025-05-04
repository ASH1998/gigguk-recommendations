import yt_dlp

def get_description(video_url):
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(video_url, download=False)
        return info.get('description', 'No description found')

# Example
url = 'https://www.youtube.com/watch?v=WAk1u5e9K7A'
print(get_description(url))
