from youtube_transcript_downloader import YouTubeDataExtractor

def main():
    # Create an instance of the extractor
    extractor = YouTubeDataExtractor(output_dir="transcripts")
    
    video_id = "WnXVwjCYQcU"
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    print(f"Working with video ID: {video_id}")
    
    # Method 1: Download and save transcript to a file
    file_path = extractor.download_transcript(video_id)
    if file_path:
        print(f"Transcript saved to: {file_path}")
    
    # # Method 2: Just get the transcript text without saving
    # print("\nGetting transcript text without saving:")
    # transcript_text = extractor.get_transcript_text(video_id)
    # if transcript_text:
    #     print(f"First 100 characters: {transcript_text[:100]}...")
    
    # # Method 3: Print individual transcript snippets
    # print("\nPrinting individual transcript snippets:")
    # extractor.print_transcript_snippets(video_id)
    
    # # Method 4: Get video description
    # print("\nGetting video description:")
    # description = extractor.get_description(video_url)
    # if description:
    #     print(f"First 100 characters of description: {description[:100]}...")
    
    # Method 5: Save video description to a file
    print("\nSaving video description to a file:")
    desc_file_path = extractor.save_description(video_url)
    if desc_file_path:
        print(f"Description saved to: {desc_file_path}")
    
    # # Custom filename example
    # print("\nSaving description with custom filename:")
    # custom_desc_path = extractor.save_description(video_url, filename="custom_description")
    # if custom_desc_path:
    #     print(f"Description saved to: {custom_desc_path}")
    
    # Example with error handling
    print("\nTrying an invalid video ID:")
    invalid_video_id = "invalid_id_123"
    result = extractor.download_transcript(invalid_video_id)
    if not result:
        print("Successfully handled the error case!")
    
    # Example of extracting video ID from URL
    test_url = "https://www.youtube.com/watch?v=WAk1u5e9K7A&feature=share"
    extracted_id = extractor.get_video_id_from_url(test_url)
    print(f"\nExtracted video ID from URL: {extracted_id}")
    
    # Method 6: Extract timestamps from a video description
    print("\nExtracting timestamps from video description:")
    timestamps = extractor.extract_timestamps(video_url=video_url)
    if timestamps:
        print(f"Found {len(timestamps)} timestamps:")
        for timestamp, title in timestamps.items():
            print(f"{timestamp} - {title}")
    
    # Example with loading from existing description file
    print("\nExtracting timestamps from existing description file:")
    with open(f"transcripts/{video_id}_description.txt", "r", encoding="utf-8") as file:
        description_content = file.read()
    
    timestamps = extractor.extract_timestamps(description=description_content)
    if timestamps:
        print(f"Found {len(timestamps)} timestamps in file")
        # Just print a few examples
        count = 0
        for timestamp, title in timestamps.items():
            if count < 5:  # Print just the first 5 timestamps as examples
                print(f"{timestamp} - {title}")
                count += 1
            else:
                break
        if len(timestamps) > 5:
            print(f"... and {len(timestamps) - 5} more")

if __name__ == "__main__":
    main()


# run local server with: python -m http.server 8000