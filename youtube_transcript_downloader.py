from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
import os
import yt_dlp
import re

class YouTubeDataExtractor:
    """
    A class to extract data from YouTube videos, including transcripts and video information.
    """
    
    def __init__(self, output_dir="transcripts"):
        """
        Initialize the extractor with an optional output directory.
        
        Args:
            output_dir (str): Directory where transcript files will be saved
        """
        self.output_dir = output_dir
        
        # Create the output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
    
    def get_video_title(self, video_url):
        """
        Get the title of a YouTube video.
        
        Args:
            video_url (str): The URL of the YouTube video
            
        Returns:
            str: The video title or None if it couldn't be retrieved
        """
        try:
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return info.get('title')
        except Exception as e:
            print(f"Error getting title for video {video_url}: {str(e)}")
            return None
    
    def sanitize_filename(self, filename):
        """
        Sanitize a string to be used as a filename.
        
        Args:
            filename (str): The string to sanitize
            
        Returns:
            str: Sanitized filename
        """
        # Replace characters that are invalid in filenames
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        # Limit the length of the filename
        return filename[:100]  # Limit to 100 characters

    def download_transcript(self, video_id, language_code=None, filename=None):
        """
        Download the transcript for a specific YouTube video and save it to a text file.
        
        Args:
            video_id (str): The YouTube video ID
            language_code (str, optional): The language code for the transcript
            filename (str, optional): Custom filename for the transcript
            
        Returns:
            str: Path to the saved transcript file or None if an error occurred
        """
        try:
            # Get transcript
            if language_code:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code])
            else:
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Format transcript by directly accessing text from each entry
            formatted_transcript = ""
            for snippet in transcript:
                formatted_transcript += snippet['text'] + "\n"
            
            # Determine filename
            if not filename:
                # Get video title and use it for filename
                video_url = f"https://www.youtube.com/watch?v={video_id}"
                video_title = self.get_video_title(video_url)
                
                if video_title:
                    # Sanitize the title to be used as a filename
                    sanitized_title = self.sanitize_filename(video_title)
                    filename = f"{sanitized_title}.txt"
                else:
                    # Fall back to video ID if title can't be retrieved
                    filename = f"{video_id}.txt"
            elif not filename.endswith('.txt'):
                filename = f"{filename}.txt"
            
            # Save transcript to file
            file_path = os.path.join(self.output_dir, filename)
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(formatted_transcript)
            
            return file_path
        
        except TranscriptsDisabled:
            print(f"Error: Transcripts are disabled for video {video_id}")
            return None
        except NoTranscriptFound:
            print(f"Error: No transcript found for video {video_id}")
            return None
        except VideoUnavailable:
            print(f"Error: Video {video_id} is unavailable")
            return None
        except Exception as e:
            # Handle the case where error might be a dictionary
            if isinstance(e, dict):
                print(f"Error downloading transcript for video {video_id}: {str(e)}")
            else:
                print(f"Error downloading transcript for video {video_id}: {str(e)}")
            return None
    
    def get_transcript_text(self, video_id, language_code=None):
        """
        Get the transcript text without saving to a file.
        
        Args:
            video_id (str): The YouTube video ID
            language_code (str, optional): The language code for the transcript
            
        Returns:
            str: The transcript text or None if an error occurred
        """
        try:
            # Get transcript
            if language_code:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code])
            else:
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Format transcript by directly accessing text from each entry
            formatted_transcript = ""
            for snippet in transcript:
                formatted_transcript += snippet['text'] + "\n"
            
            return formatted_transcript
        
        except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
            print(f"Error: {str(e)} for video {video_id}")
            return None
        except Exception as e:
            print(f"Error getting transcript for video {video_id}: {str(e)}")
            return None

    def print_transcript_snippets(self, video_id, language_code=None):
        """
        Print individual transcript snippets (similar to the provided example).
        
        Args:
            video_id (str): The YouTube video ID
            language_code (str, optional): The language code for the transcript
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get transcript
            if language_code:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[language_code])
            else:
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Print each snippet
            for snippet in transcript:
                print(snippet['text'])
            
            return True
        
        except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
            print(f"Error: {str(e)} for video {video_id}")
            return False
        except Exception as e:
            print(f"Error printing transcript for video {video_id}: {str(e)}")
            return False

    def get_description(self, video_url):
        """
        Get the description of a YouTube video.
        
        Args:
            video_url (str): The URL of the YouTube video
            
        Returns:
            str: The video description or 'No description found' if not available
        """
        try:
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return info.get('description', 'No description found')
        except Exception as e:
            print(f"Error getting description for video {video_url}: {str(e)}")
            return "Description could not be retrieved"
    
    def get_video_id_from_url(self, video_url):
        """
        Extract the video ID from a YouTube URL.
        
        Args:
            video_url (str): The URL of the YouTube video
            
        Returns:
            str: The extracted video ID or None if it couldn't be extracted
        """
        try:
            if 'youtu.be/' in video_url:
                # Handle short URLs like https://youtu.be/VIDEO_ID
                return video_url.split('youtu.be/')[1].split('?')[0]
            elif 'youtube.com/watch' in video_url:
                # Handle standard URLs like https://www.youtube.com/watch?v=VIDEO_ID
                if 'v=' in video_url:
                    return video_url.split('v=')[1].split('&')[0]
            
            # If we couldn't extract an ID, return None
            print(f"Could not extract video ID from URL: {video_url}")
            return None
        except Exception as e:
            print(f"Error extracting video ID from URL {video_url}: {str(e)}")
            return None

    def save_description(self, video_url, filename=None, output_dir=None):
        """
        Save the description of a YouTube video to a text file.
        
        Args:
            video_url (str): The URL of the YouTube video
            filename (str, optional): Custom filename for the description file
            output_dir (str, optional): Directory where the file will be saved. Defaults to the class output_dir.
            
        Returns:
            str: Path to the saved description file or None if an error occurred
        """
        try:
            # Get the description
            description = self.get_description(video_url)
            if not description:
                print(f"Could not save description: No description found for {video_url}")
                return None
                
            # Get video ID for default filename
            video_id = self.get_video_id_from_url(video_url)
            if not video_id:
                # Use a timestamp if video ID can't be extracted
                from datetime import datetime
                video_id = f"description_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
            # Determine filename
            if not filename:
                filename = f"{video_id}_description.txt"
            elif not filename.endswith('.txt'):
                filename = f"{filename}.txt"
            
            # Determine output directory
            if not output_dir:
                output_dir = self.output_dir
            
            # Ensure output directory exists
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
                
            # Save description to file
            file_path = os.path.join(output_dir, filename)
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(description)
            
            return file_path
        except Exception as e:
            print(f"Error saving description for {video_url}: {str(e)}")
            return None

    def extract_timestamps(self, description=None, video_url=None):
        """
        Extract timestamps and corresponding titles from a YouTube video description.
        
        Args:
            description (str, optional): The description text to parse
            video_url (str, optional): The URL of the YouTube video to get description from
            
        Returns:
            dict: A dictionary with timestamps as keys and titles as values
            
        Note:
            Either description or video_url must be provided. If both are provided,
            description takes precedence.
            This function can handle both formats:
            - "0:00 Anime Name" (timestamp first)
            - "Anime Name 0:00" (anime name first)
        """
        if not description and not video_url:
            print("Error: Either description or video_url must be provided")
            return {}
            
        # Get description if not provided directly
        if not description:
            description = self.get_description(video_url)
            if not description or description == "No description found":
                print(f"No description found for video: {video_url}")
                return {}
        
        # Dictionary to store timestamps and titles
        timestamps_dict = {}
        
        # Regex pattern for "timestamp title" format (0:00 Anime Name)
        timestamp_first_pattern = r'(\d+:\d+(?::\d+)?)\s+(.*?)(?=\n\d+:\d+(?::\d+)?\s+|\n\n|\Z)'
        
        # Regex pattern for "title timestamp" format (Anime Name 0:00)
        title_first_pattern = r'(.*?)\s+(\d+:\d+(?::\d+)?)(?=\n|$)'
        
        # Find matches for timestamp-first format
        timestamp_first_matches = re.findall(timestamp_first_pattern, description, re.MULTILINE)
        
        # Process timestamp-first matches
        for timestamp, title in timestamp_first_matches:
            # Clean up the title (remove extra spaces)
            title = title.strip()
            
            # Add to dictionary
            timestamps_dict[timestamp] = title
        
        # Find matches for title-first format
        title_first_matches = re.findall(title_first_pattern, description, re.MULTILINE)
        
        # Process title-first matches
        for title, timestamp in title_first_matches:
            # Clean up the title (remove extra spaces)
            title = title.strip()
            
            # If this timestamp isn't already in our dict (to avoid duplicates)
            if timestamp not in timestamps_dict:
                timestamps_dict[timestamp] = title
        
        return timestamps_dict