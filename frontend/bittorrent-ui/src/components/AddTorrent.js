import React, { useState } from 'react';
import styled from 'styled-components';
import { FaUpload, FaMagnet } from 'react-icons/fa';
import { useTorrents } from '../contexts/TorrentContext';

const AddTorrent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('file');
  const [torrentFile, setTorrentFile] = useState(null);
  const [magnetLink, setMagnetLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { addTorrentFile, addTorrentMagnet } = useTorrents();
  
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setActiveTab('file');
    setTorrentFile(null);
    setMagnetLink('');
    setError(null);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.torrent')) {
      setTorrentFile(file);
      setError(null);
    } else {
      setTorrentFile(null);
      setError('Please select a valid .torrent file');
    }
  };
  
  const handleMagnetChange = (e) => {
    setMagnetLink(e.target.value);
    setError(null);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'file' && torrentFile) {
        await addTorrentFile(torrentFile);
        closeModal();
      } else if (activeTab === 'magnet' && magnetLink) {
        if (!magnetLink.startsWith('magnet:')) {
          setError('Please enter a valid magnet link');
          setIsLoading(false);
          return;
        }
        await addTorrentMagnet(magnetLink);
        closeModal();
      } else {
        setError(activeTab === 'file' 
          ? 'Please select a torrent file' 
          : 'Please enter a magnet link'
        );
      }
    } catch (err) {
      setError(`Failed to add torrent: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <AddButton onClick={openModal}>
        <FaUpload /> Add Torrent
      </AddButton>
      
      {isModalOpen && (
        <ModalOverlay>
          <Modal>
            <ModalHeader>
              <h2>Add Torrent</h2>
              <CloseButton onClick={closeModal}>&times;</CloseButton>
            </ModalHeader>
            
            <TabContainer>
              <Tab 
                active={activeTab === 'file'} 
                onClick={() => setActiveTab('file')}
              >
                <FaUpload /> Torrent File
              </Tab>
              <Tab 
                active={activeTab === 'magnet'} 
                onClick={() => setActiveTab('magnet')}
              >
                <FaMagnet /> Magnet Link
              </Tab>
            </TabContainer>
            
            <form onSubmit={handleSubmit}>
              {activeTab === 'file' ? (
                <FileUploadContainer>
                  <FileInput 
                    type="file" 
                    id="torrentFile" 
                    accept=".torrent" 
                    onChange={handleFileChange}
                  />
                  <FileLabel htmlFor="torrentFile">
                    {torrentFile ? torrentFile.name : 'Select a .torrent file'}
                  </FileLabel>
                </FileUploadContainer>
              ) : (
                <InputContainer>
                  <Input 
                    type="text" 
                    placeholder="Enter magnet link" 
                    value={magnetLink} 
                    onChange={handleMagnetChange} 
                  />
                </InputContainer>
              )}
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <ButtonContainer>
                <CancelButton type="button" onClick={closeModal}>
                  Cancel
                </CancelButton>
                <SubmitButton type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Torrent'}
                </SubmitButton>
              </ButtonContainer>
            </form>
          </Modal>
        </ModalOverlay>
      )}
    </>
  );
};

// Styled components
const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #0069d9;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  
  h2 {
    margin: 0;
    font-size: 20px;
    color: #212529;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #6c757d;
  cursor: pointer;
  
  &:hover {
    color: #343a40;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e9ecef;
`;

const Tab = styled.div`
  flex: 1;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  background-color: ${props => props.active ? '#f8f9fa' : 'transparent'};
  border-bottom: 2px solid ${props => props.active ? '#007bff' : 'transparent'};
  color: ${props => props.active ? '#212529' : '#6c757d'};
  font-weight: ${props => props.active ? '600' : '400'};
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background-color: ${props => props.active ? '#f8f9fa' : '#f1f3f5'};
  }
`;

const FileUploadContainer = styled.div`
  padding: 20px;
`;

const FileInput = styled.input`
  display: none;
`;

const FileLabel = styled.label`
  display: block;
  width: 100%;
  padding: 32px 16px;
  background-color: #f8f9fa;
  border: 2px dashed #ced4da;
  border-radius: 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #007bff;
    background-color: #e9f4ff;
  }
`;

const InputContainer = styled.div`
  padding: 20px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
  gap: 12px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
`;

const CancelButton = styled(Button)`
  background-color: #f8f9fa;
  color: #6c757d;
  border: 1px solid #ced4da;
  
  &:hover {
    background-color: #e2e6ea;
  }
`;

const SubmitButton = styled(Button)`
  background-color: #007bff;
  color: white;
  border: none;
  
  &:hover {
    background-color: #0069d9;
  }
  
  &:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  margin: 0 20px;
  padding: 8px 12px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  font-size: 14px;
`;

export default AddTorrent; 