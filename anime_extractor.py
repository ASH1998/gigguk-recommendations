import os
import csv
import io
import json
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types
from youtube_transcript_downloader import YouTubeDataExtractor


class AnimeExtractor:
    """
    A class to extract anime references from Gigguk YouTube videos using Gemini API.
    """
    
    def __init__(self, output_dir="transcripts", api_key=None, config_file="csv_config.json"):
        """
        Initialize the AnimeExtractor with necessary components.
        
        Args:
            output_dir (str): Directory where transcript and output files will be saved
            api_key (str): Google Gemini API key. If None, it will be read from GEMINI_API_KEY env variable
            config_file (str): Path to the configuration file for tracking CSV files
        """
        # Load environment variables from .env file
        load_dotenv()
        
        self.output_dir = output_dir
        self.config_file = config_file
        self.yt_extractor = YouTubeDataExtractor(output_dir=output_dir)
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        
        if not self.api_key:
            raise ValueError("Gemini API key is required. Set GEMINI_API_KEY environment variable or pass it to the constructor.")
            
        # Initialize Gemini client
        self.gemini_client = genai.Client(api_key=self.api_key)
        
    def _read_csv_config(self):
        """
        Read the CSV configuration file.
        
        Returns:
            dict: The configuration with 'files' list or an empty dict with 'files' as empty list if file doesn't exist
        """
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                return {"files": []}
        except Exception as e:
            print(f"Error reading CSV config file: {str(e)}")
            return {"files": []}
    
    def _update_csv_config(self, csv_filename):
        """
        Update the CSV configuration file with a new CSV file if it doesn't already exist.
        
        Args:
            csv_filename (str): The filename of the CSV to add to the config
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Read current config
            config = self._read_csv_config()
            
            # Check if the file is already in the config
            if csv_filename not in config["files"]:
                # Add the new file to the list
                config["files"].append(csv_filename)
                
                # Write updated config back to file
                with open(self.config_file, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2)
                    
                print(f"Added {csv_filename} to CSV configuration file")
            
            return True
        except Exception as e:
            print(f"Error updating CSV config file: {str(e)}")
            return False
    
    def process_video(self, video_id, output_csv=None):
        """
        Process a Gigguk YouTube video to extract anime references and save as CSV.
        
        Args:
            video_id (str): The YouTube video ID
            output_csv (str, optional): Custom filename for the CSV output
            
        Returns:
            str: Path to the saved CSV file or None if an error occurred
        """
        print(f"Processing video ID: {video_id}")
        
        # 1. Get transcript
        transcript = self.yt_extractor.get_transcript_text(video_id)
        if not transcript:
            print(f"Error: Could not retrieve transcript for video {video_id}")
            return None
            
        # 2. Construct video URL and get video title and timestamps
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        video_title = self.yt_extractor.get_video_title(video_url)
        if not video_title:
            print(f"Warning: Could not retrieve video title for {video_id}, using video ID instead")
            video_title = video_id
        else:
            print(f"Video title: {video_title}")
            
        timestamps = self.yt_extractor.extract_timestamps(video_url=video_url)
        if not timestamps:
            print(f"Warning: No timestamps found for video {video_id}")
        
        # Format timestamps for the prompt
        formatted_timestamps = ""
        for timestamp, title in timestamps.items():
            formatted_timestamps += f"{timestamp} - {title}\n"
        
        # 3. Create the prompt for Gemini
        prompt = self._create_gemini_prompt(transcript, formatted_timestamps)
        
        # 4. Send to Gemini API and get response
        markdown_response = self._send_to_gemini(prompt)
        if not markdown_response:
            print(f"Error: Could not get a response from Gemini API")
            return None
            
        # 5. Convert markdown to CSV and save
        if not output_csv:
            # Create a sanitized filename from the video title
            sanitized_title = self.yt_extractor.sanitize_filename(video_title)
            output_csv = f"{sanitized_title}_anime_references.csv"
        
        csv_path = os.path.join(self.output_dir, output_csv)
        success = self._save_markdown_as_csv(markdown_response, csv_path)
        
        if success:
            print(f"Successfully saved anime references to {csv_path}")
            # Update the CSV configuration file
            self._update_csv_config(output_csv)
            return csv_path
        else:
            print(f"Error: Failed to save CSV file")
            return None
    
    def _create_gemini_prompt(self, transcript, timestamps):
        """
        Create the prompt to send to Gemini API.
        
        Args:
            transcript (str): The video transcript
            timestamps (str): Formatted timestamps from the video
            
        Returns:
            str: The formatted prompt
        """
        prompt = f"""This is a subtitles file from youtube of gigguk, make me a table with the columns: 
        Anime Title, Timestamp, Gigguk Excited?, Notes

        transcript:
        {transcript}

        here are some timestamps for your reference: 
        {timestamps}

        Note: just give a table in markdown nothing else. I will be saving this as csv, so only give markdown table"""
        
        return prompt
    
    def _send_to_gemini(self, prompt_text):
        """
        Send the prompt to Gemini API and get the response.
        
        Args:
            prompt_text (str): The prompt to send to Gemini
            
        Returns:
            str: The markdown response from Gemini or None if an error occurred
        """
        try:
            # model = "gemini-2.5-pro-preview-03-25"
            model = "gemini-2.5-pro-exp-03-25"
            contents = [
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt_text),
                    ],
                ),
            ]
            generate_content_config = types.GenerateContentConfig(
                response_mime_type="text/plain",
            )

            # Collect the full response
            full_response = ""
            for chunk in self.gemini_client.models.generate_content_stream(
                model=model,
                contents=contents,
                config=generate_content_config,
            ):
                chunk_text = chunk.text
                full_response += chunk_text
                # Print progress
                print(chunk_text, end="")
                
            return full_response
            
        except Exception as e:
            print(f"Error calling Gemini API: {str(e)}")
            return None
    
    def _save_markdown_as_csv(self, markdown_table, output_path):
        """
        Convert a markdown table to CSV and save to a file.
        
        Args:
            markdown_table (str): The markdown table from Gemini
            output_path (str): Path where the CSV file will be saved
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Parse the markdown table
            lines = markdown_table.strip().split('\n')
            
            # Remove any lines before the header (first row with |)
            while lines and '|' not in lines[0]:
                lines.pop(0)
                
            if not lines:
                print("Error: No markdown table found in the response")
                return False
                
            # Skip the separator line (second row with dashes)
            csv_rows = []
            header = None
            
            for i, line in enumerate(lines):
                if '|' not in line:
                    continue
                    
                # Split the line by | and remove leading/trailing whitespace from each cell
                cells = [cell.strip() for cell in line.split('|')]
                # Remove empty cells at the start and end (from the outer | characters)
                cells = [cell for cell in cells if cell]
                
                if i == 0:
                    # This is the header row
                    header = cells
                elif i == 1 and all('-' in cell for cell in cells):
                    # This is the separator row, skip it
                    continue
                else:
                    # These are data rows
                    csv_rows.append(cells)
            
            # Write to CSV
            with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                if header:
                    writer.writerow(header)
                writer.writerows(csv_rows)
                
            return True
            
        except Exception as e:
            print(f"Error converting markdown to CSV: {str(e)}")
            return False


def main():
    """
    Example usage of the AnimeExtractor class.
    """
    # Load environment variables from .env file
    print("Attempting to load .env file...")
    load_dotenv()
    
    # Debug: Print environment variable status
    api_key = os.environ.get("GEMINI_API_KEY")
    print(f"API key loaded: {bool(api_key)}")
    if api_key:
        print(f"First 4 characters of API key: {api_key[:4]}...")
    
    # Check if Gemini API key is set
    if not api_key:
        print("ERROR: Please set the GEMINI_API_KEY environment variable")
        print("You can set it with: set GEMINI_API_KEY=your_api_key")
        return
        
    # Create extractor
    extractor = AnimeExtractor()
    
    # Process a video
    video_id = "qUkxvTi06ww"  # Replace with the desired video ID
    
    # Example: Process a specific video
    csv_path = extractor.process_video(video_id)
    if csv_path:
        print(f"Successfully processed video and saved to {csv_path}")
    else:
        print("Failed to process the video")


if __name__ == "__main__":
    main()